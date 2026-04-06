const axios = require("axios");
const FormData = require("form-data");
const fs = require("fs");

exports.predictImage = async (imagePath) => {
  const form = new FormData();
  form.append("image", fs.createReadStream(imagePath));

  const response = await axios.post(
    `${process.env.AI_SERVICE_URL}/predict`,
    form,
    {
      headers: form.getHeaders(),
      maxBodyLength: Infinity
    }
  );

  return response.data;
};