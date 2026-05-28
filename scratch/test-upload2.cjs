const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

async function test() {
  try {
    const loginRes = await axios.post('http://localhost:8000/api/v1/users/login', {
      email: 'testupload@example.com',
      password: 'password123'
    });
    const token = loginRes.data.data.accessToken;

    const videoForm = new FormData();
    videoForm.append('title', 'Test Video');
    videoForm.append('description', 'Test Description');
    videoForm.append('category', 'All');
    
    fs.writeFileSync('scratch/dummy.mp4', Buffer.alloc(1024 * 1024));
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
