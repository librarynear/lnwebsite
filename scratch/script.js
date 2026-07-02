const fs = require('fs');
const file = 'src/app/[city]/pincode/[pincode]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/name: pincode,/g, 'name: formattedPincode,');
content = content.replace(/Best Libraries in \$\{pincode\}/g, 'Best Libraries in ${formattedPincode}');
content = content.replace(/reading rooms in \$\{pincode\}/g, 'reading rooms in ${formattedPincode}');
content = content.replace(/Study libraries in \$\{pincode\}/g, 'Study libraries in ${formattedPincode}');
content = content.replace(/<span className="text-primary">\{pincode\}<\/span>/g, '<span className="text-primary">{formattedPincode}</span>');

fs.writeFileSync(file, content);
console.log('File modified');
