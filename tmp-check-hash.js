const bcrypt = require('bcryptjs');
const hash = '$2b$10$wb/cy.NYhqNt2scvC5qKL.V2SSdvo9DNt6U3DwtI9R3w21XZYEewy';
const candidates = ['password','Password123','password123','admin','admin123','123456','qwerty','letmein','welcome','sovs2024','university','MUST2024','MUST123','20232023','2024BCS001','2024/BCS/001'];
(async () => {
  for (const pwd of candidates) {
    const ok = await bcrypt.compare(pwd, hash);
    if (ok) {
      console.log('MATCH', pwd);
      return;
    }
  }
  console.log('NO MATCH');
})();
