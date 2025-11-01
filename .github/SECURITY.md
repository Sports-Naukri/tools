# Security Policy

## Copyright & Proprietary Notice

**Copyright © 2024-present SportsNaukri. All Rights Reserved.**

This software is proprietary and confidential. Any security research, vulnerability
disclosure, or code review must be conducted under strict confidentiality.

## Supported Versions

We release patches for security vulnerabilities for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |
| < 0.1   | :x:                |

## Reporting a Vulnerability

**IMPORTANT: DO NOT create public GitHub issues for security vulnerabilities.**

If you discover a security vulnerability in this software, please follow these steps:

### 1. Private Disclosure

Send a detailed report to our security team:

- **Email**: connect@sportsnaukri.com
- **Subject**: [SECURITY] Vulnerability Report - SportsNaukri Tools

### 2. Required Information

Include the following in your report:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact and severity assessment
- Suggested fix (if available)
- Your contact information
- Whether you wish to be credited for the discovery

### 3. Response Timeline

- **Initial Response**: Within 48 hours
- **Status Update**: Within 7 days
- **Fix Timeline**: Based on severity assessment
  - Critical: 24-72 hours
  - High: 7 days
  - Medium: 30 days
  - Low: 90 days

### 4. Confidentiality

By reporting a vulnerability:

- You agree to keep the vulnerability confidential until we issue a fix
- You will not exploit the vulnerability beyond what is necessary for demonstration
- You will not access, modify, or delete data that doesn't belong to you
- All findings remain confidential and proprietary to SportsNaukri

## Security Best Practices

### For Authorized Contributors

When working with this codebase:

1. **Never commit sensitive data**

   - API keys, tokens, or credentials
   - Personal or user data
   - Internal documentation or secrets

2. **Keep dependencies updated**

   - Regularly check for security updates
   - Review dependency vulnerability reports
   - Follow the update procedures

3. **Follow secure coding practices**

   - Input validation and sanitization
   - Output encoding
   - Proper authentication and authorization
   - Secure session management

4. **Use environment variables**
   - Never hardcode sensitive configuration
   - Use `.env.local` for local development
   - Keep `.env` files out of version control

## Vulnerability Disclosure Policy

### What We Expect From You

- Good faith efforts to avoid privacy violations and data destruction
- Reasonable time to address the vulnerability before public disclosure
- No social engineering, phishing, or physical security testing
- No denial of service attacks

### What You Can Expect From Us

- Acknowledgment of your report within 48 hours
- Regular updates on our progress
- Credit for responsible disclosure (if desired)
- Good faith effort to address the issue promptly

## Scope

### In Scope

- Security vulnerabilities in the application code
- Authentication and authorization issues
- Data exposure or leakage
- Injection vulnerabilities (XSS, SQL, etc.)
- Security misconfigurations
- Cryptographic weaknesses

### Out of Scope

- Social engineering attacks
- Physical attacks against SportsNaukri personnel or facilities
- Attacks requiring physical access to a user's device
- Rate limiting issues (unless they lead to a severe issue)
- Issues in third-party dependencies (report to them directly)

## Bug Bounty Program

Currently, we do not offer a bug bounty program. However, we deeply appreciate
responsible security researchers and will acknowledge contributors in our
security advisories when fixes are released.

## Legal

This security policy is provided to encourage responsible disclosure. Security
research conducted in accordance with this policy will be considered authorized
under the Copyright Act.

We will not pursue legal action against researchers who:

- Report vulnerabilities in good faith
- Follow this security policy
- Respect the confidentiality of user data and proprietary information

## Contact

For security-related inquiries:

- **Contact**: connect@sportsnaukri.com
- **Website**: https://sportsnaukri.com

---

**Last Updated**: November 2025

**Copyright © 2024-present SportsNaukri. All Rights Reserved.**
