// backend/src/utils/tls_check.js
// Node TLS certificate fetch & simple validation
import tls from "tls";

/**
 * Fetch peer certificate info for a given host:port
 * @param {string} host e.g. "example.com"
 * @param {number} port default 443
 * @param {number} timeoutMs
 * @returns {Promise<object>} { validFrom, validTo, issuer, subject, daysRemaining, valid }
 */
export function fetchCertificate(host, port = 443, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect(
      {
        host,
        port,
        servername: host,
        rejectUnauthorized: false, // we only want to read cert info, not validate chain here
      },
      () => {
        try {
          const cert = socket.getPeerCertificate(true);
          if (!cert || Object.keys(cert).length === 0) {
            socket.end();
            return reject(new Error("No certificate returned"));
          }

          const validFrom = cert.valid_from ? new Date(cert.valid_from) : null;
          const validTo = cert.valid_to ? new Date(cert.valid_to) : null;
          const now = new Date();
          const daysRemaining =
            validTo instanceof Date ? Math.round((validTo - now) / (1000 * 60 * 60 * 24)) : null;
          const valid = validFrom && validTo ? now >= validFrom && now <= validTo : null;

          const result = {
            subject: cert.subject || null,
            issuer: cert.issuer || null,
            validFrom: validFrom ? validFrom.toISOString() : null,
            validTo: validTo ? validTo.toISOString() : null,
            daysRemaining,
            valid,
            raw: cert,
          };
          socket.end();
          resolve(result);
        } catch (err) {
          socket.end();
          reject(err);
        }
      }
    );

    socket.setTimeout(timeoutMs, () => {
      try {
        socket.destroy();
      } catch (e) {}
      reject(new Error("TLS connect timeout"));
    });

    socket.on("error", (err) => {
      try {
        socket.destroy();
      } catch (e) {}
      reject(err);
    });
  });
}
