const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isImage = file.fieldname === 'image';
    return {
      folder: isImage ? 'products/images' : 'products/documents',
      resource_type: isImage ? 'image' : 'raw',
      allowed_formats: isImage ? ['jpg', 'jpeg', 'png', 'webp'] : ['pdf', 'doc', 'docx', 'xls', 'xlsx'],
      public_id: `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9]/g, '_')}`,
    };
  },
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  }
});

module.exports = upload;

