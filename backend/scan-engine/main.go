// backend/scan-engine/main.go
package main

import (
	"encoding/json"
	"fmt"
	"net"
	"os"
	"sync"
	"time"
)

type PortResult struct {
	Port         int    `json:"port"`
	State        string `json:"state"`
	Service      string `json:"service"`
	VersionGuess string `json:"versionGuess,omitempty"`
	Banner       string `json:"banner,omitempty"`
}

type HostResult struct {
	Hostname string       `json:"hostname"`
	IP       string       `json:"ip"`
	Alive    bool         `json:"alive"`
	Ports    []PortResult `json:"ports"`
	Services map[string]interface{} `json:"services,omitempty"`
}

type ScanResult struct {
	Hosts []HostResult `json:"hosts"`
	Stats struct {
		TotalHosts   int `json:"totalHosts"`
		AliveHosts   int `json:"aliveHosts"`
		OpenPorts    int `json:"openPorts"`
		ScanDuration int `json:"scanDuration"`
	} `json:"stats"`
}

// Common ports to scan
var commonPorts = []int{
	21, 22, 23, 25, 53, 80, 110, 111, 135, 139, 143, 443, 445, 993, 995,
	1723, 3306, 3389, 5900, 8080, 8443, 8888,
}

// Service fingerprints
var serviceMap = map[int]string{
	21:   "ftp",
	22:   "ssh",
	23:   "telnet",
	25:   "smtp",
	53:   "dns",
	80:   "http",
	110:  "pop3",
	143:  "imap",
	443:  "https",
	445:  "smb",
	3306: "mysql",
	3389: "rdp",
	5432: "postgresql",
	5900: "vnc",
	6379: "redis",
	8080: "http-alt",
	8443: "https-alt",
	27017: "mongodb",
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: scan-engine <target> [ports]")
		os.Exit(1)
	}

	target := os.Args[1]
	ports := commonPorts

	// Parse custom ports if provided
	if len(os.Args) > 2 {
		// Custom port parsing logic here
	}

	result := scanHost(target, ports)

	// Output JSON
	output, err := json.MarshalIndent(result, "", "  ")
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(string(output))
}

func scanHost(target string, ports []int) ScanResult {
	startTime := time.Now()
	result := ScanResult{}

	// Resolve hostname
	ips, err := net.LookupIP(target)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to resolve %s: %v\n", target, err)
		return result
	}

	for _, ip := range ips {
		if ip.To4() == nil {
			continue // Skip IPv6 for now
		}

		hostResult := HostResult{
			Hostname: target,
			IP:       ip.String(),
			Alive:    false,
			Ports:    []PortResult{},
		}

		// Check if host is alive (ICMP or TCP ping)
		if isHostAlive(ip.String()) {
			hostResult.Alive = true
			result.Stats.AliveHosts++

			// Scan ports concurrently
			hostResult.Ports = scanPorts(ip.String(), ports)
			result.Stats.OpenPorts += len(hostResult.Ports)
		}

		result.Hosts = append(result.Hosts, hostResult)
		result.Stats.TotalHosts++
	}

	result.Stats.ScanDuration = int(time.Since(startTime).Seconds())
	return result
}

func isHostAlive(ip string) bool {
	// Try TCP connect to common ports
	testPorts := []int{80, 443, 22}

	for _, port := range testPorts {
		address := fmt.Sprintf("%s:%d", ip, port)
		conn, err := net.DialTimeout("tcp", address, 2*time.Second)
		if err == nil {
			conn.Close()
			return true
		}
	}

	return false
}

func scanPorts(ip string, ports []int) []PortResult {
	var wg sync.WaitGroup
	results := make(chan PortResult, len(ports))
	semaphore := make(chan struct{}, 100) // Limit concurrency

	for _, port := range ports {
		wg.Add(1)
		go func(p int) {
			defer wg.Done()
			semaphore <- struct{}{}        // Acquire
			defer func() { <-semaphore }() // Release

			if portResult := scanPort(ip, p); portResult != nil {
				results <- *portResult
			}
		}(port)
	}

	// Close results channel when done
	go func() {
		wg.Wait()
		close(results)
	}()

	// Collect results
	var openPorts []PortResult
	for result := range results {
		openPorts = append(openPorts, result)
	}

	return openPorts
}

func scanPort(ip string, port int) *PortResult {
	address := fmt.Sprintf("%s:%d", ip, port)
	conn, err := net.DialTimeout("tcp", address, 3*time.Second)

	if err != nil {
		return nil // Port closed or filtered
	}

	defer conn.Close()

	result := &PortResult{
		Port:    port,
		State:   "open",
		Service: serviceMap[port],
	}

	// Try to grab banner
	banner := grabBanner(conn)
	if banner != "" {
		result.Banner = banner
		result.VersionGuess = guessVersion(banner)
	}

	return result
}

func grabBanner(conn net.Conn) string {
	conn.SetReadDeadline(time.Now().Add(2 * time.Second))

	// Send HTTP request for HTTP services
	conn.Write([]byte("GET / HTTP/1.0\r\n\r\n"))

	buffer := make([]byte, 1024)
	n, err := conn.Read(buffer)
	if err != nil {
		return ""
	}

	return string(buffer[:n])
}

func guessVersion(banner string) string {
	// Simple version detection
	if len(banner) > 100 {
		banner = banner[:100]
	}

	// Extract version patterns
	// This is simplified - real implementation would use regex
	if contains(banner, "nginx") {
		return "nginx"
	}
	if contains(banner, "Apache") {
		return "Apache"
	}
	if contains(banner, "Microsoft-IIS") {
		return "IIS"
	}
	if contains(banner, "OpenSSH") {
		return "OpenSSH"
	}

	return ""
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && (s[:len(substr)] == substr || s[len(s)-len(substr):] == substr || containsMiddle(s, substr)))
}

func containsMiddle(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
