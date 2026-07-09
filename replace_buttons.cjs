const fs = require('fs');
let content = fs.readFileSync('d:/Subhani/Restaurant_Pos_fe_new/src/pages/reports/ReportsPage.tsx', 'utf-8');

content = content.replace(/<Button[^>]*downloadExcel\('([^']+)'\)[^>]*>[\s\S]*?<\/Button>/g, (match, type) => {
    if(type === 'comprehensive') return match;
    return `<Button
        variant="contained"
        size={isMobile ? "small" : "medium"}
        startIcon={<DownloadIcon sx={{ fontSize: isMobile ? '16px !important' : 'inherit' }} />}
        onClick={() => downloadExcel('${type}')}
        sx={{ borderRadius: 2, textTransform: 'none', px: isMobile ? 1.5 : 2, height: isMobile ? 32 : 36, fontSize: isMobile ? '0.75rem' : 'inherit', minWidth: 'auto', whiteSpace: 'nowrap', boxShadow: 'none' }}
    >
        {isMobile ? 'Export' : 'Export Excel'}
    </Button>`;
});

fs.writeFileSync('d:/Subhani/Restaurant_Pos_fe_new/src/pages/reports/ReportsPage.tsx', content);
console.log('Successfully updated export buttons');
