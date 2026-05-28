import multer from "multer";
import { ApiError } from "../utils/ApiError.js";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './public/temp')
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
    const ext = file.originalname.split('.').pop()
    cb(null, `${file.fieldname}-${uniqueSuffix}.${ext}`)
  }
})

const fileFilter = (req, file, cb) => {
  // Accept video and image files
  if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('image/')) {
    cb(null, true)
  } else {
    cb(new ApiError(400, 'Only video and image files are allowed!'), false)
  }
}

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
    files: 2 // Maximum 2 files (video + thumbnail)
  },
  fileFilter: fileFilter
})