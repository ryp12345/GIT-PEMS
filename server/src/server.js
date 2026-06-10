const app = require('./app');
const {port} = require('./config');
const PORT = process.env.PORT || port || 3005;
app.listen(PORT, ()=> console.log(`Server listening on ${PORT}`));
