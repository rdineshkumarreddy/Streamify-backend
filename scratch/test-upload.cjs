const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function test() {
  try {
    // 1. Register
    const regForm = new FormData();
    regForm.append('fullname', 'Test User');
    regForm.append('email', 'testupload@example.com');
    regForm.append('username', 'testupload');
    regForm.append('password', 'password123');
    fs.writeFileSync('scratch/dummy.jpg', 'fake image content');
    regForm.append('avatar', fs.createReadStream('scratch/dummy.jpg'));
    
    await axios.post('http://localhost:8000/api/v1/users/register', regForm, {
      headers: regForm.getHeaders()
    }).catch(e => console.log('Register error (maybe exists):', e.response?.data || e.message));

    // 2. Login
    const loginRes = await axios.post('http://localhost:8000/api/v1/users/login', {
      email: 'testupload@example.com',
      password: 'password123'
    });
    const token = loginRes.data.data.accessToken;

    // 3. Upload Video
    const videoForm = new FormData();
    videoForm.append('title', 'Test Video');
    videoForm.append('description', 'Test Description');
    videoForm.append('category', 'All');
    
    // Create a dummy video file
    fs.writeFileSync('scratch/dummy.mp4', Buffer.alloc(1024 * 1024)); // 1MB dummy file
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
    console.error('Upload failed:', err.response?.data || err.message);
  }
}

test();
