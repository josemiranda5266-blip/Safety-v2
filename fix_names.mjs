import fs from 'fs';

let normCode = fs.readFileSync('src/components/Console/Normative/NormativeScreen.tsx', 'utf8');
normCode = normCode.replace(/activeCompany\.name/g, 'activeCompany.tradeName || activeCompany.legalName');
fs.writeFileSync('src/components/Console/Normative/NormativeScreen.tsx', normCode);

let eppCode = fs.readFileSync('src/components/Console/Safety/EPPScreen.tsx', 'utf8');
eppCode = eppCode.replace(/activeCompany\.name/g, 'activeCompany.tradeName || activeCompany.legalName');
fs.writeFileSync('src/components/Console/Safety/EPPScreen.tsx', eppCode);
