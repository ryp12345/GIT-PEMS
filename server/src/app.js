require('dotenv').config();
const express = require('express');
const cors = require('cors');
const app = express();
const authRoutes = require('./routes/auth.routes');
const hodInstanceRoutes = require('./routes/hod/instance.routes');
const errorMiddleware = require('./middlewares/error.middleware');
const hodElectiveRoutes = require('./routes/hod/elective.routes');
const hodStatsRoutes = require('./routes/hod/stats.routes');
const hodPreferencesRoutes = require('./routes/hod/preferences.routes');
const hodStudentsRoutes = require('./routes/hod/students.routes');
const studentRoutes = require('./routes/student/student.routes');

app.use(express.json());
app.use('/api/student', studentRoutes);
const isProduction = process.env.NODE_ENV === 'production';
const allowedOrigins = (process.env.CORS_ORIGIN || '')
	.split(',')
	.map((origin) => origin.trim())
	.filter(Boolean);

function isPrivateDevOrigin(origin) {
	try {
		const { hostname } = new URL(origin);
		if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
		if (hostname.startsWith('10.')) return true;
		if (hostname.startsWith('192.168.')) return true;
		const parts = hostname.split('.').map((part) => Number(part));
		if (parts.length === 4 && parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
		return false;
	} catch (e) {
		return false;
	}
}

app.use(cors({
	origin: function(origin, callback) {
		if (!origin) {
			callback(null, true);
			return;
		}

		if (allowedOrigins.includes('*')) {
			callback(null, true);
			return;
		}

		if (allowedOrigins.length === 0) {
			// In local/dev environments, allow any explicit frontend origin unless configured.
			callback(null, true);
			return;
		}

		if (!isProduction && isPrivateDevOrigin(origin)) {
			callback(null, true);
			return;
		}

		if (allowedOrigins.includes(origin)) {
			callback(null, true);
		} else {
			callback(new Error('Not allowed by CORS: ' + origin));
		}
	},
	credentials: true
}));


app.use('/api/auth', authRoutes);
app.use('/api/hod/instances', hodInstanceRoutes);
app.use('/api/hod/electives', hodElectiveRoutes);
app.use('/api/hod/stats', hodStatsRoutes);
app.use('/api/hod/preferences', hodPreferencesRoutes);
app.use('/api/hod/students', hodStudentsRoutes);

app.use(errorMiddleware);

module.exports = app;
