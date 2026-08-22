# Publishing Guide

This document describes the process for publishing new versions of wiremd to npm.

## Prerequisites

Before publishing, ensure you have:

1. **npm Account**: You need an npm account with publish rights for the `wiremd` package
2. **NPM_TOKEN**: A valid npm access token stored as a GitHub secret
   - Create token at: https://www.npmjs.com/settings/YOUR_USERNAME/tokens
   - Token type: "Automation" (for CI/CD) or "Publish"
   - Add as GitHub secret: Settings → Secrets and variables → Actions → New repository secret
   - Secret name: `NPM_TOKEN`
3. **Bun**: The release toolchain uses bun (>= 1.4.0)

## Pre-Publication Checklist

Before creating a release, verify:

- [ ] All tests pass: `bun run test`
- [ ] Build succeeds: `bun run build`
- [ ] Type checking passes: `bun run typecheck`
- [ ] Linting passes: `bun run lint`
- [ ] Documentation is up to date
- [ ] CHANGELOG.md is updated with release notes
- [ ] Version number follows [Semantic Versioning](https://semver.org/)

## Release Process

### 1. Update Version

Bun has no equivalent of `npm version`, so bump the version manually:

1. Edit the `version` field in `package.json`
   - **Patch** (bug fixes): `0.1.7` → `0.1.8`
   - **Minor** (new features, backward compatible): `0.1.7` → `0.2.0`
   - **Major** (breaking changes): `0.1.7` → `1.0.0`
2. Commit and tag the release:

```bash
git add package.json
git commit -m "chore: release v0.1.8"
git tag v0.1.8
```

### 2. Push Changes and Tag

```bash
git push origin main
git push origin --tags
```

### 3. Create GitHub Release

1. Go to https://github.com/teezeit/wiremd/releases/new
2. Select the tag you just pushed (e.g., `v0.1.1`)
3. Set release title (e.g., `v0.1.1`)
4. Add release notes describing:
   - New features
   - Bug fixes
   - Breaking changes (if any)
   - Upgrade instructions (if needed)
5. Click "Publish release"

### 4. Automated Publishing

Once you publish the GitHub release:
- The `.github/workflows/publish.yml` workflow automatically triggers
- It will:
  1. Checkout the code
  2. Install dependencies
  3. Run tests
  4. Build the project
  5. Publish to npm with `bun publish`

Note: `bun publish` does not yet generate npm provenance attestations
([tracking issue](https://github.com/oven-sh/bun/issues/15601)); the publish
workflow switched to bun in August 2026 and drops `--provenance` accordingly.

You can monitor the progress at: https://github.com/teezeit/wiremd/actions

### 5. Verify Publication

After the workflow completes:

1. Check npm: https://www.npmjs.com/package/wiremd
2. Verify the new version is listed
3. Test installation: `bun add wiremd@latest`

## Manual Publishing (Not Recommended)

If you need to publish manually (use only in emergencies), authenticate by
writing your token to `~/.npmrc` (bun reads it for publishing):

```bash
# One-time auth setup (bun has no interactive `login`)
echo '//registry.npmjs.org/:_authToken=YOUR_TOKEN' >> ~/.npmrc

# Ensure you're on the correct git tag
git checkout v0.1.1

# Build the project
bun run build

# Publish (public access comes from publishConfig.access in package.json)
bun publish
```

## Troubleshooting

### Publishing Fails

If the GitHub Action fails:

1. Check the action logs: https://github.com/teezeit/wiremd/actions
2. Common issues:
   - Tests failing: Fix tests and create a new release
   - Build errors: Fix build issues and create a new release
   - NPM_TOKEN expired: Generate new token and update GitHub secret
   - Version already exists: Update version number

### Version Conflicts

If you accidentally published the wrong version:

1. You cannot unpublish versions less than 72 hours old
2. Instead, publish a new patch version with fixes
3. If absolutely necessary, contact npm support

### Permission Issues

If you get permission errors:

1. Verify you're a maintainer: https://www.npmjs.com/package/wiremd
2. Check your npm token has publish rights
3. Ensure `publishConfig.access` is set to `"public"` in package.json

## Package Information

- **Package name**: `wiremd`
- **npm page**: https://www.npmjs.com/package/wiremd
- **Repository**: https://github.com/teezeit/wiremd
- **Registry**: npm (public)
- **Author**: Antti Akonniemi <antti@kiskolabs.com>
- **License**: MIT

## Post-Publication

After successful publication:

1. Announce the release (if significant):
   - Update documentation site
   - Post on social media/blog (optional)
   - Notify users of breaking changes
2. Monitor for issues:
   - Watch GitHub issues
   - Check npm download stats
3. Update dependent projects if needed

## Version Strategy

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (0.x.0): New features, backward compatible
- **PATCH** (0.0.x): Bug fixes, backward compatible

For pre-1.0.0 releases, minor version bumps may include breaking changes.

## Security

- Never commit npm tokens to the repository
- Use GitHub secrets for CI/CD tokens
- Use automation tokens for GitHub Actions
- Rotate tokens periodically
- Enable 2FA on your npm account
