//
function Entry(payload) {
  if (payload.Count < 1) {
    return;
  }
  const SN_IN = Process("xiang.helper.EnvGet", "FACE_IN_SN");
  const SN_OUT = Process("xiang.helper.EnvGet", "FACE_OUT_SN");
  const OUT_MODEL = Process("xiang.helper.EnvGet", "FACE_OUT_MODE");
  var sn = payload.sn;
  var log = payload.logs[payload.Count - 1];
  // if (SN_IN == sn) {
  if (OUT_MODEL != "1") {
    Put(log.real_user_id, new Date().toISOString(), "进入");
    // } else if (SN_OUT == sn) {
  } else {
    Put(log.real_user_id, new Date().toISOString(), "离开");

    console.log("After Live");

    // 这个逻辑需要优化
    if (IsSuppler(log.real_user_id)) {
      AfterOut(log.real_user_id, "入库"); // 入库
    } else {
      AfterOut(log.real_user_id, "出库"); // 出库
    }
  }
}

// AfterOut
function AfterOut(user_sn, action) {
  res = Process("models.user.Get", {
    wheres: [{ column: "user_sn", value: user_sn }],
  });

  // 时间范围
  scope = getTimeScope(res);
  // if (scope.from == "" || scope.to == "") {
  //   return;
  // }

  // 读取IDs
  IDs = getIDs(scope.from, scope.to);
  console.log(IDs);

  if (IDs.length == 0) {
    console.log("获取ID信息失败");
    return;
  }

  //  同步数据
  var data = { ids: IDs, user_sn: user_sn, action: action };
  SyncData(data);
}

// SyncData
function SyncData(data) {
  const NODE_ID = Process("xiang.helper.EnvGet", "NODE_ID");
  const HOST = Process("xiang.helper.EnvGet", "CLOUD_API_HOST");
  const SECRET = Process("xiang.helper.EnvGet", "CLOUD_API_SECRET");
  const now = new Date().toISOString();
  const response = Process(
    "xiang.network.PostJSON",
    `${HOST}/api/sync/data`,
    { data: data, sync_at: new Date().toISOString(), node_id: NODE_ID },
    {
      Authorization: SECRET,
      ContentType: "application/json;charset=utf-8",
    }
  );

  if (response.status == 200) {
    Process("models.user.DeleteWhere", {
      wheres: [{ column: "user_sn", value: data.user_sn }],
    });

    console.log(data);

    var ids = [];
    var rfids = data.ids || [];
    for (var i in rfids) {
      var rfid = rfids[i] || {};
      ids.push(rfid.id);
    }

    Process("models.rfid.DeleteWhere", {
      wheres: [{ column: "id", value: ids, op: "in" }],
    });
  }
  console.log({ sync: response.status == 200, uptime: now });
  return;
}

function getIDs(from, to) {
  res = Process("models.rfid.Get", {
    // wheres: [
    //   { column: "uptime", value: from, op: "ge" },
    //   { column: "uptime", value: to, op: "lt" },
    // ],
  });

  if (res.code) {
    return [];
  }
  return res;
}

function getTimeScope(data) {
  data = data || [];
  from = "";
  to = "";
  for (var i in data) {
    var user = data[i] || {};
    if (user.action == "进入") {
      from = user.uptime;
    } else if (user.action == "离开") {
      to = user.uptime;
    }
  }
  return {
    from: from,
    to: to,
  };
}

// Put 存储用户信息
function Put(user_sn, recog_time, action) {
  res = Process("models.user.Create", {
    user_sn: user_sn,
    uptime: recog_time,
    action: action,
  });
  if (res.code) {
    console.log(`PUT ${user_sn}:  ${res.message}`);
    return;
  }
  SyncUser(user_sn);
}

function IsSuppler(sn) {
  const SP_MODE = Process("xiang.helper.EnvGet", "SP_MODE");
  if (SP_MODE == "1") {
    return true;
  }
  return false;

  // sn = sn || "";
  // if (sn.indexOf("SP") != -1) {
  //   return true;
  // }
  // return false;
}

function IsUser(sn) {
  sn = sn || "";
  if (sn.indexOf("US") != -1) {
    return true;
  }
  return false;
}

// SyncUser
function SyncUser(user_sn) {
  const NODE_ID = Process("xiang.helper.EnvGet", "NODE_ID");
  const HOST = Process("xiang.helper.EnvGet", "CLOUD_API_HOST");
  const SECRET = Process("xiang.helper.EnvGet", "CLOUD_API_SECRET");
  users = Process("models.user.Get", {
    select: ["user_sn", "uptime", "action"],
    wheres: [{ column: "user_sn", value: user_sn }],
  });
  const now = new Date().toISOString();
  const response = Process(
    "xiang.network.PostJSON",
    `${HOST}/api/sync/user`,
    { data: users, sync_at: new Date().toISOString(), node_id: NODE_ID },
    {
      Authorization: SECRET,
      ContentType: "application/json;charset=utf-8",
    }
  );
  console.log({ sync: response.status == 200, uptime: now });
  return;
}
