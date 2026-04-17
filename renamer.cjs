/**
 * renamer.cjs — White-Label Build Automation Script
 * ==================================================
 * Usage: node renamer.cjs <brandname>
 * Example: node renamer.cjs mythri
 *
 * What it does:
 *  1. Reads brands/<brandname>/config.json
 *  2. Updates src/config/brandConfig.ts
 *  3. Updates src/style.css CSS variables
 *  4. Updates capacitor.config.ts (appId, appName)
 *  5. Updates index.html <title>
 *  6. Updates .env (VITE_API_URL, VITE_TENANT_SLUG)
 *  7. Updates Android strings.xml and build.gradle if present
 *  8. Copies brand assets (icon, logo, splash) to native folders
 */
const fs   = require('fs');
const path = require('path');

const brand = process.argv[2];

if (!brand) {
    console.error('❌ Please specify a brand name. Example: node renamer.cjs mythri');
    process.exit(1);
}

const brandFolder = path.join(__dirname, 'brands', brand);
const configPath  = path.join(brandFolder, 'config.json');

if (!fs.existsSync(configPath)) {
    console.error(`❌ Config not found for brand "${brand}" at:\n   ${configPath}`);
    console.error('   Available brands:', fs.readdirSync(path.join(__dirname, 'brands')).join(', '));
    process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
console.log(`\n🚀 White-label build for: ${config.appName} (${brand})\n`);

// ── 1. Update src/config/brandConfig.ts ──────────────────────────────────
const brandConfigPath = path.join(__dirname, 'src', 'config', 'brandConfig.ts');
const brandConfigContent = `// =====================================================================
// BRAND CONFIG — Auto-updated by renamer.cjs during build time.
// DO NOT edit manually if you are running a brand-specific build.
// =====================================================================
export const BRAND_CONFIG = {
  appName: "${config.appName}",
  appId: "${config.appId}",
  primaryColor: "${config.primaryColor}",
  secondaryColor: "${config.secondaryColor}",
  accentColor: "${config.accentColor || '#10B981'}",
  apiBaseUrl: "${config.apiBaseUrl}",
  tenantSlug: "${config.tenantSlug}",
  stripePublicKey: "${config.stripePublicKey || ''}",
  fontFamily: "${config.fontFamily || 'Inter'}",
  splashBg: "${config.splashBg || '#0f172a'}",
} as const;
`;
fs.writeFileSync(brandConfigPath, brandConfigContent);
console.log('✅ Updated src/config/brandConfig.ts');

// ── 2. Update src/style.css CSS variables ────────────────────────────────
const stylePath = path.join(__dirname, 'src', 'style.css');
let styleContent = fs.readFileSync(stylePath, 'utf-8');
styleContent = styleContent.replace(/--brand-primary:\s*[^;]+;/, `--brand-primary:   ${config.primaryColor};`);
styleContent = styleContent.replace(/--brand-secondary:\s*[^;]+;/, `--brand-secondary: ${config.secondaryColor};`);
styleContent = styleContent.replace(/--brand-accent:\s*[^;]+;/, `--brand-accent:    ${config.accentColor || '#10B981'};`);
styleContent = styleContent.replace(/--brand-splash-bg:\s*[^;]+;/, `--brand-splash-bg: ${config.splashBg || '#0f172a'};`);
styleContent = styleContent.replace(/--brand-name:\s*"[^"]*";/, `--brand-name:      "${config.appName}";`);
styleContent = styleContent.replace(/--brand-font:\s*"[^"]*";/, `--brand-font:      "${config.fontFamily || 'Inter'}";`);
fs.writeFileSync(stylePath, styleContent);
console.log('✅ Updated src/style.css CSS variables');

// ── 3. Update capacitor.config.ts ────────────────────────────────────────
const capConfigPath = path.join(__dirname, 'capacitor.config.ts');
if (fs.existsSync(capConfigPath)) {
    let capConfigContent = fs.readFileSync(capConfigPath, 'utf-8');
    capConfigContent = capConfigContent.replace(/appId: '[^']+'/, `appId: '${config.appId}'`);
    capConfigContent = capConfigContent.replace(/appName: '[^']+'/, `appName: '${config.appName}'`);
    fs.writeFileSync(capConfigPath, capConfigContent);
    console.log('✅ Updated capacitor.config.ts');
}

// ── 4. Update index.html <title> ─────────────────────────────────────────
const htmlPath = path.join(__dirname, 'index.html');
if (fs.existsSync(htmlPath)) {
    let htmlContent = fs.readFileSync(htmlPath, 'utf-8');
    htmlContent = htmlContent.replace(/<title>[^<]*<\/title>/, `<title>${config.appName}</title>`);
    fs.writeFileSync(htmlPath, htmlContent);
    console.log('✅ Updated index.html <title>');
}

// ── 5. Update .env ────────────────────────────────────────────────────────
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
    let envContent = fs.readFileSync(envPath, 'utf-8');

    // Replace or add VITE_API_URL
    if (/^VITE_API_URL=/m.test(envContent)) {
        envContent = envContent.replace(/^VITE_API_URL=.*/m, `VITE_API_URL=${config.apiBaseUrl}`);
    } else {
        envContent = `VITE_API_URL=${config.apiBaseUrl}\n` + envContent;
    }

    // Replace or add VITE_TENANT_SLUG
    if (/^VITE_TENANT_SLUG=/m.test(envContent)) {
        envContent = envContent.replace(/^VITE_TENANT_SLUG=.*/m, `VITE_TENANT_SLUG=${config.tenantSlug}`);
    } else {
        envContent = envContent + `\nVITE_TENANT_SLUG=${config.tenantSlug}`;
    }

    // Replace or add VITE_STRIPE_PUBLISHABLE_KEY
    if (config.stripePublicKey) {
        if (/^VITE_STRIPE_PUBLISHABLE_KEY=/m.test(envContent)) {
            envContent = envContent.replace(/^VITE_STRIPE_PUBLISHABLE_KEY=.*/m, `VITE_STRIPE_PUBLISHABLE_KEY=${config.stripePublicKey}`);
        } else {
            envContent = envContent + `\nVITE_STRIPE_PUBLISHABLE_KEY=${config.stripePublicKey}`;
        }
    }

    fs.writeFileSync(envPath, envContent);
    console.log('✅ Updated .env (VITE_API_URL, VITE_TENANT_SLUG)');
}

// ── 6. Android native: strings.xml ───────────────────────────────────────
const stringsXmlPath = path.join(__dirname, 'android/app/src/main/res/values/strings.xml');
if (fs.existsSync(stringsXmlPath)) {
    let stringsContent = fs.readFileSync(stringsXmlPath, 'utf-8');
    stringsContent = stringsContent.replace(/<string name="app_name">[^<]*<\/string>/, `<string name="app_name">${config.appName}</string>`);
    stringsContent = stringsContent.replace(/<string name="title_activity_main">[^<]*<\/string>/, `<string name="title_activity_main">${config.appName}</string>`);
    fs.writeFileSync(stringsXmlPath, stringsContent);
    console.log('✅ Updated Android strings.xml (app name)');
}

// ── 7. Android native: build.gradle (applicationId) ──────────────────────
const appBuildGradlePath = path.join(__dirname, 'android/app/build.gradle');
if (fs.existsSync(appBuildGradlePath)) {
    let gradleContent = fs.readFileSync(appBuildGradlePath, 'utf-8');
    // Keep namespace stable (avoids breaking Java/Kotlin package paths)
    gradleContent = gradleContent.replace(/namespace "[^"]+"/, `namespace "com.nexzen.pos"`);
    // Change applicationId so the phone treats each brand as a separate app
    gradleContent = gradleContent.replace(/applicationId "[^"]+"/, `applicationId "${config.appId}"`);
    fs.writeFileSync(appBuildGradlePath, gradleContent);
    console.log(`✅ Updated Android build.gradle → applicationId: ${config.appId}`);
}

// ── 8. Copy brand assets ──────────────────────────────────────────────────
const brandAssetsDir = path.join(brandFolder, 'assets');

if (fs.existsSync(brandAssetsDir)) {
    console.log(`\n📦 Copying assets for ${brand}...`);

    // Icon: look for icon.png first, then fall back to logo.png
    let iconFileName = fs.readdirSync(brandAssetsDir).find(f => /^icon\.(png|jpg|jpeg|webp)$/i.test(f));
    if (!iconFileName) {
        iconFileName = fs.readdirSync(brandAssetsDir).find(f => /^logo\.(png|jpg|jpeg|webp)$/i.test(f));
        if (iconFileName) console.log(`   🔸 icon.png missing — using ${iconFileName} as app icon fallback`);
    }

    if (iconFileName) {
        const iconSrcPath = path.join(brandAssetsDir, iconFileName);
        const iconTargets = [
            'android/app/src/main/res/mipmap-anydpi-v26/ic_launcher_foreground.png',
            'android/app/src/main/res/mipmap-hdpi/ic_launcher.png',
            'android/app/src/main/res/mipmap-hdpi/ic_launcher_round.png',
            'android/app/src/main/res/mipmap-hdpi/ic_launcher_foreground.png',
            'android/app/src/main/res/mipmap-mdpi/ic_launcher.png',
            'android/app/src/main/res/mipmap-mdpi/ic_launcher_round.png',
            'android/app/src/main/res/mipmap-mdpi/ic_launcher_foreground.png',
            'android/app/src/main/res/mipmap-xhdpi/ic_launcher.png',
            'android/app/src/main/res/mipmap-xhdpi/ic_launcher_round.png',
            'android/app/src/main/res/mipmap-xhdpi/ic_launcher_foreground.png',
            'android/app/src/main/res/mipmap-xxhdpi/ic_launcher.png',
            'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_round.png',
            'android/app/src/main/res/mipmap-xxhdpi/ic_launcher_foreground.png',
            'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher.png',
            'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_round.png',
            'android/app/src/main/res/mipmap-xxxhdpi/ic_launcher_foreground.png',
            'ios/App/App/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png',
        ];

        iconTargets.forEach(dest => {
            const destPath = path.join(__dirname, dest);
            const destDir  = path.dirname(destPath);
            if (fs.existsSync(destDir)) {
                try {
                    fs.copyFileSync(iconSrcPath, destPath);
                } catch {
                    console.warn(`   ⚠️  Failed to copy icon to ${dest}`);
                }
            }
        });
        console.log('   ✅ Native app icons updated');
    }

    // UI Logo (shown inside the React app)
    const logoFileName = fs.readdirSync(brandAssetsDir).find(f => /^logo\.(png|jpg|jpeg|webp)$/i.test(f));
    if (logoFileName) {
        const logoSrc  = path.join(brandAssetsDir, logoFileName);
        const logoDir  = path.join(__dirname, 'src', 'assets', 'images');
        const logoDest = path.join(logoDir, 'brand-logo.png');
        if (!fs.existsSync(logoDir)) fs.mkdirSync(logoDir, { recursive: true });
        fs.copyFileSync(logoSrc, logoDest);
        console.log(`   ✅ Brand logo → src/assets/images/brand-logo.png`);
    }

    // Splash screen
    let splashFileName = fs.readdirSync(brandAssetsDir).find(f => /^splash\.(png|jpg|jpeg|webp)$/i.test(f));
    if (!splashFileName) {
        splashFileName = fs.readdirSync(brandAssetsDir).find(f => /^logo\.(png|jpg|jpeg|webp)$/i.test(f));
        if (splashFileName) console.log(`   🔸 splash.png missing — using ${splashFileName} as splash screen fallback`);
    }

    if (splashFileName) {
        const splashSrc  = path.join(brandAssetsDir, splashFileName);
        const splashDest = path.join(__dirname, 'android/app/src/main/res/drawable/splash.png');
        const splashDir  = path.dirname(splashDest);
        if (fs.existsSync(splashDir)) {
            fs.copyFileSync(splashSrc, splashDest);
            console.log(`   ✅ Splash screen → Android drawable`);
        }
    }
} else {
    console.log(`ℹ️  No 'assets' folder in brands/${brand}/ — skipping icon/logo copy.`);
    console.log(`   To add assets, create: brands/${brand}/assets/icon.png, logo.png, splash.png`);
}

console.log(`\n🎉 White-label preparation complete for: ${config.appName}`);
console.log(`   Next: npm run build:${brand}  or  npm run android:${brand}\n`);
