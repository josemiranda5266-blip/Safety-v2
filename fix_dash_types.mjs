import fs from 'fs';
let code = fs.readFileSync('src/services/dashboardService.ts', 'utf8');

code = code.replace(/d\.data\(\) } as Incident\)/g, '(d.data() as any) } as Incident)');
code = code.replace(/d\.data\(\) } as Inspection\)/g, '(d.data() as any) } as Inspection)');
code = code.replace(/d\.data\(\) } as HygieneMeasurement\)/g, '(d.data() as any) } as HygieneMeasurement)');
code = code.replace(/d\.data\(\) } as TrainingActivity\)/g, '(d.data() as any) } as TrainingActivity)');
code = code.replace(/d\.data\(\) } as LegalRequirement\)/g, '(d.data() as any) } as LegalRequirement)');
code = code.replace(/d\.data\(\) } as any\)/g, '(d.data() as any) } as any)');

fs.writeFileSync('src/services/dashboardService.ts', code);
