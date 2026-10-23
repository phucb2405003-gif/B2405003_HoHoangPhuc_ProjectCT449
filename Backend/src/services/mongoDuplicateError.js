function isMongoDuplicateKey(error) {
    return error?.code === 11000 || error?.code === "E11000" || error?.codeName === "DuplicateKey";
}

module.exports = { isMongoDuplicateKey };
