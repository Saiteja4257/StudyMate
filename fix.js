const fs = require('fs');
const files = [
  'Frontend/src/components/studyspace/StudySpaceTutor.tsx',
  'Frontend/src/components/studyspace/ModuleDetail.tsx',
  'Frontend/src/components/studyspace/ExportPDFButton.tsx',
  'Frontend/src/pages/StudySpaceCreate.tsx',
  'Frontend/src/pages/StudySpacesList.tsx',
  'Frontend/src/pages/StudySpaceDashboard.tsx',
  'Backend/src/services/studySpaceAiService.ts',
  'Backend/src/controllers/studySpaceController.ts'
];
files.forEach(f => {
  try {
    let content = fs.readFileSync(f, 'utf8');
    content = content.replace(/\\`/g, '`');
    fs.writeFileSync(f, content);
    console.log('Fixed', f);
  } catch(e) {
    console.error(e);
  }
});
