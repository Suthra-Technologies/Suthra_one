lines = open('src/pages/reports/ReportsPage.tsx', encoding='utf-8').readlines()
# Remove duplicate renderDeliveryReport: lines 5073-5251 = indices 5072-5250
new_lines = lines[:5071] + lines[5251:]
open('src/pages/reports/ReportsPage.tsx', 'w', encoding='utf-8').writelines(new_lines)
print(f'Done. Was {len(lines)} lines, now {len(new_lines)} lines')
