/**
 * Get RFID
 * @param {*} data
 */
function Read(data) {
  sn = getSN(data);
  if (sn != "") {
    Process("models.rfid.Create", { sn: sn, uptime: new Date().toISOString() });
  }
}

function getSN(data) {
  // 100000012021128798321101 15 2d 02 f2 96 72 1e 52 b9 cd
  var idstr = data || "";
  if (idstr.length != 36) {
    return "";
  }
  return BigInt(
    "0x" + idstr.substring(8, idstr.length - 8).toUpperCase()
  ).toString(10);
}
