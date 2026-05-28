const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function test() {
  try {
    const regForm = new FormData();
    regForm.append('fullname', 'Test User 3');
    regForm.append('email', 'testupload3@example.com');
    regForm.append('username', 'testupload3');
    regForm.append('password', 'password123');
    fs.writeFileSync('scratch/dummy.jpg', 'fake image content');
    regForm.append('avatar', fs.createReadStream('scratch/dummy.jpg'));
    
    await axios.post('http://localhost:8000/api/v1/users/register', regForm, {
      headers: regForm.getHeaders()
    }).catch(e => console.log('Register error (maybe exists):', e.response?.data?.message || e.message));

    const loginRes = await axios.post('http://localhost:8000/api/v1/users/login', {
      email: 'testupload3@example.com',
      password: 'password123'
    });
    const token = loginRes.data.data.accessToken;

    const videoForm = new FormData();
    videoForm.append('title', 'Test Video');
    videoForm.append('description', 'Test Description');
    videoForm.append('category', 'All');
    
    fs.writeFileSync('scratch/dummy.mp4', Buffer.alloc(1024));
    videoForm.append('videoFile', fs.createReadStream('scratch/dummy.mp4'));

    console.log("Uploading video...");
    const uploadRes = await axios.post('http://localhost:8000/api/v1/videos/publishAVideo', videoForm, {
      headers: {
        ...videoForm.getHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('Upload success:', uploadRes.data);
  } catch (err) {
    console.error('Upload failed:', err.response ? err.response.data : err.message);
  }
}
test();
