import React, { useState, useRef } from 'react';
import axios from 'axios';

export default function StudentLogin() {
  const [usn, setUsn] = useState('');
  const [uid, setUid] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [preferencesHtml, setPreferencesHtml] = useState('');
  const nameRef = useRef(null);

  const handleUsnChange = (e) => {
    setUsn(e.target.value);
    setError('');
    setPreferencesHtml('');
  };
  const handleUidChange = (e) => {
    setUid(e.target.value);
    setError('');
    setPreferencesHtml('');
  };
  const handleNameChange = async (e) => {
    const value = e.target.value;
    setName(value);
    setError('');
    setPreferencesHtml('');
    if (value.length > 3) {
      // Disable further editing
      nameRef.current.disabled = true;
      try {
        setIsSubmitting(true);
        const res = await axios.post('/api/student/checkname', {
          usn1: usn,
          name1: value,
          uid: uid
        });
        setPreferencesHtml(res.data); // Expecting HTML from backend
      } catch (err) {
        setError(
          err.response?.data?.error || 'Unable to verify student details.'
        );
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
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
        </form>
        <div className="perferences mt-6" dangerouslySetInnerHTML={{ __html: preferencesHtml }} />
      </div>
    </div>
  );
}
