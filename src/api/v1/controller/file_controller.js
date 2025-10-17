const fs = require("fs");
const path = require("path");

async function uploadFile(imageFile) {
  if (!imageFile) {
    throw new Error("No file uploaded");
  }

  const extension = path.extname(imageFile.originalname);

  const oldPath = imageFile.path;

  const filename = imageFile.filename;
  const newPath = path.join(
    __dirname,
    "../../../resources",
    filename + extension
  );

  try {
    const resourcesDir = path.join(__dirname, "../../../resources");
    await fs.promises.mkdir(resourcesDir, { recursive: true });
    await fs.promises.rename(oldPath, newPath);
  } catch (error) {
    throw error;
  }

  const image = filename + extension;

  return {
    code: 201,
    message: "Upload image successfully",
    file: "resources/" + image,
  };
}

async function uploadMultipleFile(imageFiles) {
    const uploadedImages = []

    for(const file of imageFiles) {
        const extension = path.extname(file.originalname)
        const oldPath = file.path
        const newPath = path.join(__dirname, '../../../resources/', file.filename + extension)

        await fs.promises.rename(oldPath, newPath)

        const imageUrl = "resources/" + file.filename + extension
        uploadedImages.push(imageUrl);
    }

    return {
        code: 200,
        message: "Upload successful",
        files: uploadedImages
    }
}


async function deleteFile(nameFile) {
  const filePath = path.join(__dirname, "../../../" + nameFile);

  if (fs.existsSync(filePath)) {
    fs.promises.rm(filePath);
  }

  return {
    code: 200,
    message: "Delete successful",
  };
}

module.exports = { uploadFile, deleteFile, uploadMultipleFile };
