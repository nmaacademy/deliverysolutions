# State - 2026-09-18
Goal: Integrare locală logo Rețetar pe versiunea GitHub nmaacademy v1.3, fără commit sau push
Done:
- Sincronizat `nmaacademy/main` la `cb1ac0c` (v1.3) pe branch local `nmaacademy-main`
- Integrat logo în header, intro, hartă, curier și PDF-ul meniului zilei
- Actualizat numele public, faviconul, iconurile PWA și metadatele
- Eliminat loaderul intro și accelerat clipul la `1.3x`
- Eliminat logo-ul suprapus din intro; brandingul rămâne doar în clip
- Restaurată tema zinc originală; culorile logo-ului rămân în elementele de brand
- Pinul restaurantului se formează animat din discul verde-petrol al logo-ului
- Coșul intră ca foaie translucidă, fără backdrop negru; navbarul rămâne vizibil
- Cardurile „Oferte speciale” au înălțime și line-height corectate pentru a nu tăia textul
- `npm run lint` și `npm run build` trec
In progress:
- Server local activ la `http://localhost:3000/`
- Capturi vizuale după conectarea unui browser în sesiune
Decided:
- Redesign țintit pe branding; tema generală rămâne zincul original
- Letteringul se folosește direct din SVG, nu se recreează cu font web
Next: Deschide localhost într-un browser conectat și capturează Home, Meniu și Hartă
Open: Niciun browser nu este disponibil în sesiunea curentă
