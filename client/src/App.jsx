import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import AuthProvider from './context/AuthContext';
import Login from './pages/auth/Login';
import HODDashboard from './pages/HOD/Dashboard';
import StudentLogin from './pages/Student/StudentLogin';

const hodRoutes = [
	'/dashboard',
	'/elective-instance',
	'/elective-stats'
];

export default function App(){
	return (
		<AuthProvider>
			<BrowserRouter>
				<Routes>
					<Route path="/login" element={<Login/>} />
                <Route path="/student-login" element={<StudentLogin />} />
					{hodRoutes.map((path) => (
						<Route key={path} path={path} element={<HODDashboard />} />
					))}
					<Route path="/elective-instance/:instanceId" element={<HODDashboard />} />
					<Route path="/elective-instance/:instanceId/view" element={<HODDashboard />} />
					<Route path="/" element={<Navigate to="/login" replace />} />
					<Route path="*" element={<Navigate to="/login" replace />} />
				</Routes>
			</BrowserRouter>
		</AuthProvider>
	);
}
