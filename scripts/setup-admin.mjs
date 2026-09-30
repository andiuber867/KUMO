import {pbkdf2Sync,randomBytes} from 'node:crypto';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
// Run manually to generate a fresh administrator password in the local environment.
const username=process.argv[2]||'admin';
if(!/^[a-zA-Z0-9._-]{3,50}$/.test(username))throw Error('Usa un usuario de 3 a 50 caracteres: letras, números, punto, guion o guion bajo.');
const password=process.argv[3]||'admin123';
const salt=randomBytes(24).toString('hex');
const hash=pbkdf2Sync(password,salt,100000,32,'sha256').toString('hex');
const previous=existsSync('.env')?readFileSync('.env','utf8'):'';
const preserved=previous.split(/\r?\n/).filter(line=>!/^ADMIN_(EMAIL|USERNAME|PASSWORD_HASH|PASSWORD_SALT)=/.test(line)&&line.trim()).join('\n');
writeFileSync('.env',`${preserved}\nADMIN_USERNAME=${username}\nADMIN_PASSWORD_SALT=${salt}\nADMIN_PASSWORD_HASH=${hash}\n`);
console.log(`Acceso local configurado.\nUsuario: ${username}\nContraseña: ${password}\nGuarda la contraseña. La configuración contiene únicamente su hash.\nPara producción, actualiza las tres variables ADMIN_ en el alojamiento.`);
