import React, { useState, useRef, useEffect } from 'react';
import api from '../../api/axios';


export default function StudentLogin() {
  const [usn, setUsn] = useState('');
  const [uid, setUid] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingPrefs, setIsSubmittingPrefs] = useState(false);
  const [preferencesHtml, setPreferencesHtml] = useState('');
  const [groups, setGroups] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState({});
  const [instanceId, setInstanceId] = useState(null);
  const nameRef = useRef(null);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    try {
      const draft = localStorage.getItem('electivePrefDraft');
      if (draft) {
        const parsed = JSON.parse(draft);
        if (parsed && Object.keys(parsed).length > 0) {
          setSelectedOrders(parsed);
        }
      }
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    if (groups.length > 0 && Object.keys(selectedOrders).length > 0) {
      localStorage.setItem('electivePrefDraft', JSON.stringify(selectedOrders));
    }
  }, [selectedOrders, groups]);

  useEffect(() => {
    if (groups.length > 0) {
      let draft = null;
      try {
        const raw = localStorage.getItem('electivePrefDraft');
        draft = raw ? JSON.parse(raw) : null;
      } catch (e) { /* ignore */ }

      const initial = {};
      groups.forEach(g => {
        const existing = (g.existingPreferences || []).map(p => p.coursecode);
        initial[g.group] = existing.length > 0 ? existing : (draft?.[g.group] || []);
      });
      setSelectedOrders(initial);
    }
  }, [groups]);

  const clearDraft = () => {
    localStorage.removeItem('electivePrefDraft');
  };

  const handleUsnChange = (e) => {
    setUsn(e.target.value);
    setError('');
    setPreferencesHtml('');
    setInstanceId(null);
    setGroups([]);
    setSelectedOrders({});
  };
  const handleUidChange = (e) => {
    setUid(e.target.value);
    setError('');
    setPreferencesHtml('');
    setInstanceId(null);
    setGroups([]);
    setSelectedOrders({});
  };
  const handleNameChange = async (e) => {
    const value = e.target.value;
    setName(value);
    setPreferencesHtml('');
    if (value.length === 4) {
      if (nameRef.current) nameRef.current.disabled = true;
      try {
        setIsSubmitting(true);
        setError('');
        const res = await api.post('/student/checkname', {
          usn1: usn,
          name1: value,
          uid: uid
        });
        if (res.data && res.data.groups) {
          setGroups(res.data.groups || []);
          setSelectedOrders({});
          setPreferencesHtml('');
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
      setError('');
    }
  };

  function showNotification(message, type = 'success') {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: '', type: 'success' }), 3500);
  }

  const toggleCourse = (groupName, coursecode) => {
    setSelectedOrders(prev => {
      const current = prev[groupName] || [];
      if (current.includes(coursecode)) {
        return { ...prev, [groupName]: current.filter(c => c !== coursecode) };
      } else {
        return { ...prev, [groupName]: [...current, coursecode] };
      }
    });
  };

  const handleSubmitAll = async () => {
    setError('');
    setShowConfirm(true);
  };

  const handleConfirmSubmit = async () => {
    setShowConfirm(false);

    const incompleteGroups = groups.filter(g => {
      const order = selectedOrders[g.group] || [];
      return order.length === 0 && g.courses.length > 0;
    });

    if (incompleteGroups.length > 0) {
      setError(`Please rank all courses for: ${incompleteGroups.map(g => g.group).join(', ')}`);
      return;
    }

    try {
      setIsSubmittingPrefs(true);
      if (instanceId == null) {
        setError('Unable to submit preferences: student instance not found. Please verify details again.');
        setIsSubmittingPrefs(false);
        return;
      }

      for (const group of groups) {
        const order = selectedOrders[group.group] || [];
        if (order.length === 0) continue;

        const prefs = order.map((coursecode, idx) => ({ coursecode, preference: idx + 1 }));
        await api.post('/student/preferences', {
          usn,
          electivegroup: group.group,
          preferences: prefs,
          instance_id: instanceId
        });
      }

      clearDraft();
      showNotification('All preferences submitted successfully!', 'success');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Unable to submit preferences.');
      setIsSubmittingPrefs(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      {notification.show && (
        <div className={`fixed right-6 top-6 z-50 flex items-center gap-3 rounded-lg px-5 py-3 text-sm font-medium text-white shadow-lg transition-all ${notification.type === 'error' ? 'bg-red-600' : 'bg-green-600'}`}>
          <span>{notification.message}</span>
          <button type="button" onClick={() => setNotification({ show: false, message: '', type: 'success' })} className="ml-2 text-white/80 hover:text-white">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
      )}

      {isSubmittingPrefs && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
          <div className="flex flex-col items-center gap-4 rounded-xl bg-white px-10 py-8 shadow-2xl">
            <svg className="h-12 w-12 animate-spin text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-lg font-semibold text-gray-700">Submitting preferences...</p>
            <p className="text-sm text-gray-500">Please wait, do not close this page.</p>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">Confirm Submission</h3>
            <p className="mb-4 text-sm text-gray-600">You are about to submit your elective preferences for all groups. Are you sure you want to continue?</p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSubmit}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Yes, Submit
              </button>
            </div>
          </div>
        </div>
      )}

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
                disabled={isSubmitting || isSubmittingPrefs}
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
                disabled={isSubmitting || isSubmittingPrefs}
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
                disabled={isSubmitting || isSubmittingPrefs}
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
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-800">Rank your elective preferences</h2>
                  <span className="text-sm text-gray-500">Check courses in order of preference (1 = highest)</span>
                </div>

                <div className="space-y-6">
                  {groups.map((group) => {
                    const existingPrefs = group.existingPreferences || [];
                    const hasExisting = existingPrefs.length > 0;
                    const courses = group.courses || [];
                    const currentOrder = selectedOrders[group.group] || [];

                    return (
                      <div key={group.group} className={`rounded-lg border overflow-hidden ${hasExisting ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-200'}`}>
                        <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                          <h3 className="font-semibold text-gray-800">{group.group}</h3>
                          {hasExisting && (
                            <p className="text-xs text-yellow-700 mt-0.5">You have previously submitted preferences.</p>
                          )}
                        </div>

                        {hasExisting ? (
                          <div className="px-4 pt-4">
                            <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Previously Submitted Preferences</div>
                            <div className="overflow-x-auto rounded border border-yellow-200 bg-white">
                              <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-blue-600">
                                  <tr>
                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-white">Sl.No.</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-white">Course Code</th>
                                    <th className="px-4 py-2 text-left text-xs font-medium uppercase tracking-wider text-white">Course Name</th>
                                    <th className="px-4 py-2 text-center text-xs font-medium uppercase tracking-wider text-white">Preference</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                  {existingPrefs.map((r, idx) => (
                                    <tr key={r.coursecode}>
                                      <td className="px-4 py-2 text-center text-sm text-gray-600">{idx + 1}</td>
                                      <td className="px-4 py-2 text-center text-sm text-gray-600">{r.coursecode}</td>
                                      <td className="px-4 py-2 text-sm text-gray-600">{r.courseName}</td>
                                      <td className="px-4 py-2 text-center text-sm text-gray-600">{r.preference}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        ) : (
                          <div className="p-4">
                            {courses.length === 0 ? (
                              <p className="text-sm text-gray-500 italic">No courses available in this group.</p>
                            ) : (
                              courses.map((c) => {
                                const checked = currentOrder.includes(c.coursecode);
                                const prefNum = checked ? currentOrder.indexOf(c.coursecode) + 1 : '';
                                return (
                                  <div key={c.coursecode} className="flex items-center gap-3 mb-3 last:mb-0">
                                    <input
                                      type="checkbox"
                                      id={`chk_${group.group}_${c.coursecode}`}
                                      checked={checked}
                                      onChange={() => toggleCourse(group.group, c.coursecode)}
                                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor={`chk_${group.group}_${c.coursecode}`} className="flex-1 text-sm text-gray-700 cursor-pointer">
                                      {c.coursecode} - {c.courseName}
                                    </label>
                                    <input
                                      type="text"
                                      className="w-12 border rounded px-2 py-1 text-center text-sm bg-gray-100 text-gray-600"
                                      value={prefNum}
                                      readOnly
                                      placeholder="-"
                                    />
                                  </div>
                                );
                              })
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {(() => {
                  const allSubmitted = groups.every(g => {
                    if ((g.courses || []).length === 0) return true;
                    return (g.existingPreferences || []).length > 0;
                  });
                  if (allSubmitted) {
                    return (
                      <div className="mt-6 rounded-lg border border-green-200 bg-green-50 p-4 text-center">
                        <p className="text-sm font-medium text-green-800">You have submitted preferences for all elective groups.</p>
                      </div>
                    );
                  }
                  return (
                    <div className="mt-6 flex items-center justify-between">
                      <p className="text-sm text-gray-500">Rank all courses across all groups, then submit.</p>
                      <button
                        type="button"
                        onClick={() => setShowConfirm(true)}
                        className="rounded-lg bg-blue-600 px-8 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        disabled={isSubmittingPrefs}
                      >
                        Submit All Preferences
                      </button>
                    </div>
                  );
                })()}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
