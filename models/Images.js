const mongoose = require("mongoose");
const schema = mongoose.Schema;

const imagesSchema = schema({
    userId:{
        type: schema.Types.ObjectId, ref: 'Users' 
    },
    name: {
        type: String
    },
    description: {
        type: String
    },
    fileName: {
        type: String
    }
})

module.exports = mongoose.model("images", imagesSchema);
