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
  // Array of course codes in the order selected
  const [selectedOrder, setSelectedOrder] = useState([]);
  const [success, setSuccess] = useState('');
  const [instanceId, setInstanceId] = useState(null);
  const nameRef = useRef(null);

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
        setError(
          err.response?.data?.error || 'Unable to verify student details.'
        );
      } finally {
        setIsSubmitting(false);
        if (nameRef.current) nameRef.current.disabled = false;
      }
    } else {
      setError(''); // Clear error if user is still typing
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-3xl bg-white rounded-xl shadow-lg p-12">
        <h2 className="text-2xl font-bold mb-6 text-center">Student Elective Registration</h2>
        <form className="space-y-4" onSubmit={e => e.preventDefault()}>
          <div>
            <label className="block mb-1 font-semibold">USN</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={usn}
              onChange={handleUsnChange}
              placeholder="Enter USN"
              disabled={isSubmitting}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">UID</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
              value={uid}
              onChange={handleUidChange}
              placeholder="Enter UID"
              disabled={isSubmitting}
              required
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">First 4 characters of Name</label>
            <input
              type="text"
              className="w-full border rounded px-3 py-2"
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
            <div className="bg-red-100 text-red-700 p-2 rounded text-sm">{error}</div>
          )}
          {success && (
            <div className="bg-green-100 text-green-700 p-2 rounded text-sm">{success}</div>
          )}
        </form>
        <div className="perferences mt-6">
          {preferencesHtml ? (
            <div dangerouslySetInnerHTML={{ __html: preferencesHtml }} />
          ) : groups.length > 0 ? (
            <div>
              <div className="mb-3">
                <label className="block mb-1 font-semibold text-primary">Select Elective Group</label>
                <select
                  className="w-full border rounded px-3 py-2"
                  value={selectedGroup}
                  onChange={(e) => {
                      const g = e.target.value;
                      setSelectedGroup(g);
                      const grp = groups.find((x) => x.group === g) || null;
                      setGroupCourses(grp ? grp.courses : []);
                      setExistingPreferences(grp ? grp.existingPreferences || [] : []);
                      setSelectedOrder([]);
                      setError('');
                      setSuccess('');
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
                  <div className="alert alert-danger text-center mb-3" role="alert"><h4><b>You have already Registered your preferences for this elective group</b></h4></div>
                  <table className="table table-bordered table-striped table-info w-full">
                    <thead>
                      <tr>
                        <th className='text-center'>Sl.No.</th>
                        <th className='text-center'>Course Code</th>
                        <th className='text-center'>Course Name</th>
                        <th className='text-center'>Preference</th>
                      </tr>
                    </thead>
                    <tbody>
                      {existingPreferences.map((r, idx) => (
                        <tr key={r.coursecode}>
                          <td className='text-center'>{idx + 1}</td>
                          <td className='text-center'>{r.coursecode}</td>
                          <td>{r.courseName}</td>
                          <td className='text-center'>{r.preference}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : groupCourses.length > 0 && (
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setError('');
                    setSuccess('');
                    // All courses must be selected
                    if (selectedOrder.length !== groupCourses.length) {
                      setError('You must select all courses and assign preferences.');
                      return;
                    }
                    // Build preferences array in order
                    const prefs = selectedOrder.map((coursecode, idx) => ({ coursecode, preference: idx + 1 }));
                    try {
                      setIsSubmitting(true);
                      if (instanceId == null) {
                        setError('Unable to submit preferences: student instance not found. Please verify details again.');
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
                      setSuccess('Preferences submitted successfully.');
                    } catch (err) {
                      setError(err.response?.data?.error || 'Unable to submit preferences.');
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
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded" disabled={isSubmitting}>Submit Preferences</button>
                  </div>
                </form>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
