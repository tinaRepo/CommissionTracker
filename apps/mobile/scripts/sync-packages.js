const fs = require('fs');
const path = require('path');

const targets = [
    { from: '../../packages/types/src', to: './lib/packages/types' },
    { from: '../../packages/supabase/src', to: './lib/packages/supabase' },
    { from: '../../packages/hooks/src', to: './lib/packages/hooks' },
];

// @commission-tracker/* を相対パスに置換するルール
const replacements = [
    { from: `'@commission-tracker/supabase'`, to: `'../supabase/index'` },
    { from: `'@commission-tracker/types'`, to: `'../types/index'` },
    { from: `from '../supabase/index'`, to: `from '../supabase/index'` },
    // hooks内からsupabaseへの参照
    { from: `from '@commission-tracker/supabase'`, to: `from '../supabase/index'` },
    { from: `from '@commission-tracker/types'`, to: `from '../types/index'` },
];

function copyDir(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        // client.ts はmobile用を維持するためスキップ
        if (entry.name === 'client.ts') continue;

        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            let content = fs.readFileSync(srcPath, 'utf-8');
            // @commission-tracker/* の参照を相対パスに置換
            content = content
                .replace(/from '@commission-tracker\/supabase'/g, "from '../supabase/index'")
                .replace(/from '@commission-tracker\/types'/g, "from '../types/index'")
                .replace(/import type { SupabaseClient } from '@commission-tracker\/supabase'/g,
                    "import type { SupabaseClient } from '../supabase/client'");
            fs.writeFileSync(destPath, content, 'utf-8');
        }
    }
}

for (const { from, to } of targets) {
    const src = path.resolve(__dirname, '..', from);
    const dest = path.resolve(__dirname, '..', to);
    copyDir(src, dest);
    console.log(`✅ synced: ${from} → ${to}`);
}

console.log('🎉 packages sync complete!');