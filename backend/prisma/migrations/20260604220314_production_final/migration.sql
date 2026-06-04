-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PENTESTER', 'VIEWER');

-- CreateEnum
CREATE TYPE "TargetType" AS ENUM ('DOMAIN', 'IP', 'URL', 'CIDR');

-- CreateEnum
CREATE TYPE "AssetType" AS ENUM ('HOST', 'IP', 'URL', 'SERVICE');

-- CreateEnum
CREATE TYPE "ScanProfile" AS ENUM ('QUICK_RECON', 'FULL_VAPT', 'WEB_APP_SCAN', 'COMPLIANCE_SNAPSHOT', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ScanStatus" AS ENUM ('QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VulnCategory" AS ENUM ('INJECTION', 'BROKEN_AUTH', 'SENSITIVE_DATA', 'XXE', 'BROKEN_ACCESS', 'SECURITY_MISCONFIG', 'XSS', 'INSECURE_DESERIALIZATION', 'VULNERABLE_COMPONENTS', 'INSUFFICIENT_LOGGING', 'SSRF', 'OPEN_REDIRECT', 'INFORMATION_DISCLOSURE', 'NETWORK', 'CSRF', 'IDOR', 'FILE_UPLOAD', 'BUSINESS_LOGIC', 'OTHER');

-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO');

-- CreateEnum
CREATE TYPE "FindingStatus" AS ENUM ('NEW', 'OPEN', 'CONFIRMED', 'FIXED', 'REOPENED', 'ACCEPTED_RISK', 'FALSE_POSITIVE');

-- CreateEnum
CREATE TYPE "EvidenceType" AS ENUM ('REQUEST', 'RESPONSE', 'PAYLOAD', 'SCREENSHOT', 'LOG', 'CODE_SNIPPET', 'OAST_CALLBACK');

-- CreateEnum
CREATE TYPE "ReportFormat" AS ENUM ('PDF', 'JSON', 'HTML', 'CSV');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "TemplateTarget" AS ENUM ('URL', 'HEADER', 'BODY', 'COOKIE');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'VIEWER',
    "org_id" TEXT,
    "is_email_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_token" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "lock_until" TIMESTAMP(3),
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
    "mfa_secret" TEXT,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "targets" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "TargetType" NOT NULL,
    "value" TEXT NOT NULL,
    "description" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationMethod" TEXT,
    "verificationToken" TEXT,
    "verified_at" TIMESTAMP(3),
    "allow_subdomains" BOOLEAN NOT NULL DEFAULT false,
    "exclude_patterns" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "subdomains" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "user_id" TEXT NOT NULL,
    "org_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "targets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assets" (
    "id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "type" "AssetType" NOT NULL,
    "value" TEXT NOT NULL,
    "discovered_by" TEXT,
    "first_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_seen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip_address" TEXT,
    "ports" JSONB,
    "services" JSONB,
    "technologies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "endpoints" (
    "id" TEXT NOT NULL,
    "asset_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'GET',
    "status_code" INTEGER,
    "discovered_by" TEXT,
    "parameters" JSONB,
    "headers" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "endpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scans" (
    "id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT,
    "scheduled_scan_id" TEXT,
    "profile" "ScanProfile" NOT NULL,
    "status" "ScanStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "current_phase" TEXT,
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "duration" INTEGER,
    "config" JSONB,
    "stats" JSONB,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "findings" (
    "id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "asset_id" TEXT,
    "endpoint_id" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "VulnCategory" NOT NULL,
    "severity" "Severity" NOT NULL,
    "cvss" DOUBLE PRECISION,
    "cve_id" TEXT,
    "cwe" TEXT,
    "owasp" TEXT,
    "remediation" TEXT NOT NULL,
    "references" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" "FindingStatus" NOT NULL DEFAULT 'OPEN',
    "false_positive" BOOLEAN NOT NULL DEFAULT false,
    "detected_by" TEXT NOT NULL,
    "confidence" INTEGER NOT NULL DEFAULT 100,
    "cvss_vector" TEXT,
    "business_impact" TEXT,
    "compliance_mappings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "findings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "finding_id" TEXT NOT NULL,
    "type" "EvidenceType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oast_callbacks" (
    "id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "payload_id" TEXT NOT NULL,
    "protocol" TEXT NOT NULL,
    "source_ip" TEXT NOT NULL,
    "request_data" JSONB,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matched" BOOLEAN NOT NULL DEFAULT false,
    "finding_id" TEXT,

    CONSTRAINT "oast_callbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cves" (
    "id" TEXT NOT NULL,
    "cve_id" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "cvss_score" DOUBLE PRECISION NOT NULL,
    "cvss_vector" TEXT,
    "vendor" TEXT,
    "product" TEXT,
    "version_start" TEXT,
    "version_end" TEXT,
    "references" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "published_date" TIMESTAMP(3) NOT NULL,
    "last_modified" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reports" (
    "id" TEXT NOT NULL,
    "scan_id" TEXT NOT NULL,
    "format" "ReportFormat" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'PENDING',
    "content" JSONB,
    "file_path" TEXT,
    "file_size" INTEGER,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resource_id" TEXT,
    "ip_address" TEXT NOT NULL,
    "user_agent" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scheduled_scans" (
    "id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "profile" "ScanProfile" NOT NULL,
    "cron_expression" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,
    "last_run_at" TIMESTAMP(3),
    "next_run_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_scans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "custom_templates" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "severity" "Severity" NOT NULL,
    "author" TEXT NOT NULL DEFAULT 'SECORA',
    "target" "TemplateTarget" NOT NULL DEFAULT 'URL',
    "yaml_content" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "custom_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "macros" (
    "id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "steps" JSONB NOT NULL,
    "session_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "macros_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" TEXT NOT NULL,
    "finding_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "targets_user_id_idx" ON "targets"("user_id");

-- CreateIndex
CREATE INDEX "targets_type_idx" ON "targets"("type");

-- CreateIndex
CREATE INDEX "assets_target_id_idx" ON "assets"("target_id");

-- CreateIndex
CREATE INDEX "assets_type_idx" ON "assets"("type");

-- CreateIndex
CREATE INDEX "assets_value_idx" ON "assets"("value");

-- CreateIndex
CREATE INDEX "endpoints_asset_id_idx" ON "endpoints"("asset_id");

-- CreateIndex
CREATE INDEX "endpoints_url_idx" ON "endpoints"("url");

-- CreateIndex
CREATE INDEX "scans_target_id_idx" ON "scans"("target_id");

-- CreateIndex
CREATE INDEX "scans_user_id_idx" ON "scans"("user_id");

-- CreateIndex
CREATE INDEX "scans_status_idx" ON "scans"("status");

-- CreateIndex
CREATE INDEX "scans_scheduled_scan_id_idx" ON "scans"("scheduled_scan_id");

-- CreateIndex
CREATE INDEX "scans_created_at_idx" ON "scans"("created_at");

-- CreateIndex
CREATE INDEX "findings_scan_id_idx" ON "findings"("scan_id");

-- CreateIndex
CREATE INDEX "findings_severity_idx" ON "findings"("severity");

-- CreateIndex
CREATE INDEX "findings_category_idx" ON "findings"("category");

-- CreateIndex
CREATE INDEX "findings_status_idx" ON "findings"("status");

-- CreateIndex
CREATE INDEX "evidence_finding_id_idx" ON "evidence"("finding_id");

-- CreateIndex
CREATE UNIQUE INDEX "oast_callbacks_payload_id_key" ON "oast_callbacks"("payload_id");

-- CreateIndex
CREATE INDEX "oast_callbacks_scan_id_idx" ON "oast_callbacks"("scan_id");

-- CreateIndex
CREATE INDEX "oast_callbacks_payload_id_idx" ON "oast_callbacks"("payload_id");

-- CreateIndex
CREATE UNIQUE INDEX "cves_cve_id_key" ON "cves"("cve_id");

-- CreateIndex
CREATE INDEX "cves_cve_id_idx" ON "cves"("cve_id");

-- CreateIndex
CREATE INDEX "cves_product_idx" ON "cves"("product");

-- CreateIndex
CREATE INDEX "cves_severity_idx" ON "cves"("severity");

-- CreateIndex
CREATE INDEX "reports_scan_id_idx" ON "reports"("scan_id");

-- CreateIndex
CREATE INDEX "audit_logs_user_id_idx" ON "audit_logs"("user_id");

-- CreateIndex
CREATE INDEX "audit_logs_action_idx" ON "audit_logs"("action");

-- CreateIndex
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CreateIndex
CREATE INDEX "scheduled_scans_target_id_idx" ON "scheduled_scans"("target_id");

-- CreateIndex
CREATE INDEX "scheduled_scans_user_id_idx" ON "scheduled_scans"("user_id");

-- CreateIndex
CREATE INDEX "scheduled_scans_enabled_idx" ON "scheduled_scans"("enabled");

-- CreateIndex
CREATE INDEX "scheduled_scans_next_run_at_idx" ON "scheduled_scans"("next_run_at");

-- CreateIndex
CREATE INDEX "custom_templates_enabled_idx" ON "custom_templates"("enabled");

-- CreateIndex
CREATE INDEX "macros_target_id_idx" ON "macros"("target_id");

-- CreateIndex
CREATE INDEX "comments_finding_id_idx" ON "comments"("finding_id");

-- CreateIndex
CREATE INDEX "comments_user_id_idx" ON "comments"("user_id");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "targets" ADD CONSTRAINT "targets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "targets" ADD CONSTRAINT "targets_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assets" ADD CONSTRAINT "assets_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "endpoints" ADD CONSTRAINT "endpoints_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scans" ADD CONSTRAINT "scans_scheduled_scan_id_fkey" FOREIGN KEY ("scheduled_scan_id") REFERENCES "scheduled_scans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_asset_id_fkey" FOREIGN KEY ("asset_id") REFERENCES "assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "findings" ADD CONSTRAINT "findings_endpoint_id_fkey" FOREIGN KEY ("endpoint_id") REFERENCES "endpoints"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reports" ADD CONSTRAINT "reports_scan_id_fkey" FOREIGN KEY ("scan_id") REFERENCES "scans"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_scans" ADD CONSTRAINT "scheduled_scans_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scheduled_scans" ADD CONSTRAINT "scheduled_scans_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "macros" ADD CONSTRAINT "macros_target_id_fkey" FOREIGN KEY ("target_id") REFERENCES "targets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_finding_id_fkey" FOREIGN KEY ("finding_id") REFERENCES "findings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
