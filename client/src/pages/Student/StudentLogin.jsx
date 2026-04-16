import React, { useState, useRef } from 'react';
import api from '../../api/axios';


export default function StudentLogin() {
  const [usn, setUsn] = useState('');
  const [uid, setUid] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preferencesHtml, setPreferencesHtml] = useState('');
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [groupCourses, setGroupCourses] = useState([]);
  const [existingPreferences, setExistingPreferences] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState([]);
  const [instanceId, setInstanceId] = useState(null);
  const nameRef = useRef(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const handleUsnChange = (e) => {
    setUsn(e.target.value);
    setError('');
    setPreferencesHtml('');
    setInstanceId(null);
  };
  const handleUidChange = (e) => {
    setUid(e.target.value);
    setError('');
    setPreferencesHtml('');
    setInstanceId(null);
  };
  const handleNameChange = async (e) => {
    const value = e.target.value;
    setName(value);
    setPreferencesHtml('');
    // Only fire the check when the user has entered 4 characters
    if (value.length === 4) {
      if (nameRef.current) nameRef.current.disabled = true;
      try {
        setIsSubmitting(true);
        setError(''); // Clear error only before API call
        const res = await api.post('/student/checkname', {
          usn1: usn,
          name1: value,
          uid: uid
        });
        // If server returned structured JSON, use it; otherwise treat as HTML
        if (res.data && res.data.groups) {
          setGroups(res.data.groups || []);
          setSelectedGroup('');
          setGroupCourses([]);
          setPreferencesHtml('');
          // Store instanceId if present
          if (Object.prototype.hasOwnProperty.call(res.data?.student || {}, 'instanceId')) {
            setInstanceId(res.data.student.instanceId);
          } else {
            setInstanceId(null);
          }
        } else {
          const html = typeof res.data === 'string' ? res.data : (res.data?.html || JSON.stringify(res.data));
          setPreferencesHtml(html);
        }
      } catch (err) {
        setError(err.response?.data?.error || 'Unable to verify student details.');
        showNotification(err.response?.data?.error || 'Unable to verify student details.', 'error');
      } finally {
        setIsSubmitting(false);
        if (nameRef.current) nameRef.current.disabled = false;
      }
    } else {
      setError(''); // Clear error if user is still typing
    }
  };

  // Notification logic
  function showNotification(message, type = 'success') {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3500);
  }

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      {/* Notification */}
      {notification.show ? (
        <div className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg transition-all ${notification.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          <span>{notification.message}</span>
          <button type="button" onClick={() => setNotification({ show: false, message: '', type: 'success' })} className="ml-2 text-white/80 hover:text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      ) : null}

      <div className="mx-auto w-full max-w-3xl rounded-xl bg-white shadow-xl overflow-hidden">
        <div className="bg-blue-600 px-8 py-6 text-center">
          <h1 className="mb-2 text-3xl font-extrabold text-white">Student Elective Registration</h1>
          <p className="text-base text-blue-100">Enter your details and register preferences for electives</p>
        </div>
        <div className="px-8 py-8">
          <form className="grid grid-cols-1 gap-6 md:grid-cols-2" onSubmit={e => e.preventDefault()}>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">USN</label>
              <input
                type="text"
                className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={usn}
                onChange={handleUsnChange}
                placeholder="Enter USN"
                disabled={isSubmitting}
                required
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">UID</label>
              <input
                type="text"
                className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={uid}
                onChange={handleUidChange}
                placeholder="Enter UID"
                disabled={isSubmitting}
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-gray-700">First 4 characters of Name</label>
              <input
                type="text"
                className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={name}
                onChange={handleNameChange}
                placeholder="Enter first 4 characters of your name"
                disabled={isSubmitting}
                ref={nameRef}
                required
                maxLength={4}
              />
            </div>
            {error && (
              <div className="md:col-span-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>
            )}
          </form>

          <div className="mt-8">
            {preferencesHtml ? (
              <div dangerouslySetInnerHTML={{ __html: preferencesHtml }} />
            ) : groups.length > 0 ? (
              <div>
                <div className="mb-5">
                  <label className="mb-2 block text-sm font-medium text-gray-700">Select Elective Group</label>
                  <select
                    className="block w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={selectedGroup}
                    onChange={(e) => {
                      const g = e.target.value;
                      setSelectedGroup(g);
                      const grp = groups.find((x) => x.group === g) || null;
                      setGroupCourses(grp ? grp.courses : []);
                      setExistingPreferences(grp ? grp.existingPreferences || [] : []);
                      setSelectedOrder([]);
                      setError('');
                    }}
                  >
                    <option value="">-- Select --</option>
                    {groups.map((g) => (
                      <option key={g.group} value={g.group}>{g.group}</option>
                    ))}
                  </select>
                </div>

                {selectedGroup && existingPreferences && existingPreferences.length > 0 ? (
                  <div>
                    <div className="mb-4 rounded border border-yellow-200 bg-yellow-50 p-3 text-center text-yellow-800"><b>You have already registered your preferences for this elective group</b></div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-blue-600">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Sl.No.</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Course Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Course Name</th>
                            <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-white">Preference</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 bg-white">
                          {existingPreferences.map((r, idx) => (
                            <tr key={r.coursecode}>
                              <td className="px-6 py-3 text-center">{idx + 1}</td>
                              <td className="px-6 py-3 text-center">{r.coursecode}</td>
                              <td className="px-6 py-3">{r.courseName}</td>
                              <td className="px-6 py-3 text-center">{r.preference}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : groupCourses.length > 0 && (
                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      setError('');
                      if (selectedOrder.length !== groupCourses.length) {
                        setError('You must select all courses and assign preferences.');
                        showNotification('You must select all courses and assign preferences.', 'error');
                        return;
                      }
                      const prefs = selectedOrder.map((coursecode, idx) => ({ coursecode, preference: idx + 1 }));
                      try {
                        setIsSubmitting(true);
                        if (instanceId == null) {
                          setError('Unable to submit preferences: student instance not found. Please verify details again.');
                          showNotification('Unable to submit preferences: student instance not found. Please verify details again.', 'error');
                          return;
                        }
                        await api.post('/student/preferences', { usn, electivegroup: selectedGroup, preferences: prefs, instance_id: instanceId });
                        setPreferencesHtml('');
                        setGroups([]);
                        setGroupCourses([]);
                        setSelectedGroup('');
                        setSelectedOrder([]);
                        setExistingPreferences([]);
                        setInstanceId(null);
                        showNotification('Preferences submitted successfully.', 'success');
                      } catch (err) {
                        setError(err.response?.data?.error || 'Unable to submit preferences.');
                        showNotification(err.response?.data?.error || 'Unable to submit preferences.', 'error');
                      } finally {
                        setIsSubmitting(false);
                      }
                    }}
                  >
                    <div className="mb-2 font-semibold">Courses</div>
                    {groupCourses.map((c) => {
                      const checked = selectedOrder.includes(c.coursecode);
                      const prefNum = checked ? selectedOrder.indexOf(c.coursecode) + 1 : '';
                      return (
                        <div key={c.coursecode} className="flex items-center gap-3 mb-2">
                          <input
                            type="checkbox"
                            id={`chk_${c.coursecode}`}
                            checked={checked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOrder((prev) => [...prev, c.coursecode]);
                              } else {
                                setSelectedOrder((prev) => prev.filter(code => code !== c.coursecode));
                              }
                            }}
                          />
                          <label htmlFor={`chk_${c.coursecode}`} className="flex-1">{c.coursecode} - {c.courseName}</label>
                          <input
                            type="text"
                            className="w-16 border rounded px-2 py-1 text-center bg-gray-100"
                            value={prefNum}
                            readOnly
                            placeholder=""
                          />
                        </div>
                      );
                    })}
                    <div className="mt-4">
                      <button type="submit" className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50" disabled={isSubmitting}>Submit Preferences</button>
                    </div>
                  </form>
                )}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
