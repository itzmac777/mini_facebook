function isParamsEmpty(obj) {
  let isEmpty = false
  if (!obj) return true
  for (let [key, value] of Object.entries(obj)) {
    if (value == "" || value.trim() == "") {
      isEmpty = true
      break
    }
  }
  return isEmpty
}

async function wrapTC(req, res, fn) {
  return await fn(req, res).catch((err) => {
    console.log(err)
    // res.status(500).send("Internal Server Error")
  })
}

module.exports = {
  isParamsEmpty,
  wrapTC,
}
