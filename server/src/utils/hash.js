const bcrypt = require('bcrypt');

exports.hash = async (s) => await bcrypt.hash(s, 10);
exports.compare = async (plain, hashed) => {
	try {
		return await bcrypt.compare(plain, hashed);
	} catch (e) {
		return false;
	}
};


// // TEMPORARY TEST to get the password 
// (async () => {
// 	const hash = await bcrypt.hash('Password@123', 10);
// 	console.log(hash);
// })();