import fs from 'fs';

let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "import { ModulePlaceholder } from './components/Console/ModulePlaceholder';",
  "import { ModulePlaceholder } from './components/Console/ModulePlaceholder';\nimport { ReportsScreen } from './components/Console/Reports/ReportsScreen';"
);

code = code.replace(
  /\{\(\/\/activeTab === 'corrective_actions' \|\|\s*activeTab === 'reports'\) && \(\s*<ModulePlaceholder\s*moduleKey=\{activeTab\}\s*onNavigateHome=\{.*\}\s*\/>\s*\)\}/g,
  "{activeTab === 'reports' && <ReportsScreen />}"
);

fs.writeFileSync('src/App.tsx', code);
