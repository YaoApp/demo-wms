// 更新用户行为接口
// {
//   "data": [
//       {
//           "action": "Leave",
//           "uptime": "2022-01-26 20:10:46",
//           "user_sn": "DL000001"
//       }
//   ],
//   "node_id": "1",
//   "sync_at": "2022-01-26T20:10:46.022Z"
// }
// yao run scripts.sync.UserEvent '::{"data":[{"action":"Income","uptime":"2022-01-26 20:10:46","user_sn":"DL000001"}],"node_id":"1","sync_at":"2022-01-26T20:10:46.022Z"}'
// yao run scripts.sync.UserEvent '::{"data":[{"action":"Leave","uptime":"2022-01-26 20:12:22","user_sn":"DL000001"}],"node_id":"1","sync_at":"2022-01-26T20:10:46.022Z"}'
function UserEvent(payload) {
  console.log(payload);
  payload = payload || {};
  SyncLog(payload.node_id, "User", payload.data, payload.sync_at);

  // 处理逻辑
  var data = payload.data || [];
  for (var i in data) {
    var event = data[i] || {};
    var user_sn = event.user_sn;
    var user_id = getUserID(user_sn);

    // 更新记录
    Process("xiang.table.Save", "record.total", {
      warehouse_id: payload.node_id,
      user_id: user_id,
      type: event.action,
      uptime: new Date().toISOString(),
      status: "Effect",
    });
  }

  return 1;
}

function getUserID(user_sn) {
  var users = Process("models.user.Get", {
    select: ["id", "user_sn"],
    wheres: [{ column: "user_sn", value: user_sn }],
  });
  if (users.code && users.code != 200) {
    console.log(`未找到用户 ${user_sn} ${users.message}`);
    throw new Error(`未找到用户 ${user_sn} ${users.message}`);
  }

  if (users.length == 0) {
    console.log(`未找到用户 ${user_sn}`);
    throw new Error(`未找到用户 ${user_sn}`);
  }

  var user = users[0] || {};
  return user.id;
}

function SyncLog(warehouse_id, event, data, sync_at) {
  Process("models.synclog.Create", {
    warehouse_id: warehouse_id,
    data: data,
    sync_at: sync_at,
    event: event,
  });
}

// 更新数据接口
// {
//   "data": {
//       "action": "Outdoor",
//       "ids": [
//           {
//               "id": 1,
//               "sn": "100000012021124947278772",
//               "uptime": "2022-01-26 20:04:14"
//           },
//           {
//               "id": 2,
//               "sn": "100000012021123642243533",
//               "uptime": "2022-01-26 20:04:19"
//           },
//           {
//               "id": 3,
//               "sn": "100000012021128798321101",
//               "uptime": "2022-01-26 20:04:37"
//           },
//           {
//               "id": 4,
//               "sn": "100000012021129634062011",
//               "uptime": "2022-01-26 20:04:41"
//           }
//       ],
//       "user_sn": "DL000001"
//   },
//   "node_id": "1",
//   "sync_at": "2022-01-26T20:10:46.025Z"
// }
// yao run scripts.sync.Data '::{"data":{"action":"Outdoor","ids":[{"id":1,"sn":"100000012021124947278772","uptime":"2022-01-26 20:04:14"},{"id":2,"sn":"100000012021123642243533","uptime":"2022-01-26 20:04:19"},{"id":3,"sn":"100000012021128798321101","uptime":"2022-01-26 20:04:37"},{"id":4,"sn":"100000012021129634062011","uptime":"2022-01-26 20:04:41"}],"user_sn":"DL000001"},"node_id":"1","sync_at":"2022-01-26T20:10:46.025Z"}'
function Data(payload) {
  // console.log(payload);
  payload = payload || {};
  SyncLog(payload.node_id, "Data", payload.data, payload.sync_at);
  var data = payload.data || {};
  var user_id = getUserID(data.user_sn);
  var type = data.action;
  var logs = data.ids || [];
  for (var i in logs) {
    var log = logs[i] || {};
    var sn = ParseSN(log.sn);
    var sku_id = getSkuID(sn.sku_sn);
    var plan_id = getPlanID(sn.plan_sn);

    // 更新记录
    Process("xiang.table.Save", "record.total", {
      warehouse_id: payload.node_id,
      user_id: user_id,
      type: type,
      sn: log.sn,
      plan_id: plan_id,
      sku_id: sku_id,
      uptime: new Date().toISOString(),
      status: "Effect",
    });
  }

  return 1;
}

function getPlanID(plan_sn) {
  var plans = Process("models.plan.Get", {
    select: ["id", "plan_sn"],
    wheres: [{ column: "plan_sn", value: plan_sn }],
  });

  if (plans.code && plans.code != 200) {
    console.log(`未找到计划信息数据 ${sku_sn} ${plans.message}`);
    throw new Error(`未找到计划信息数据 ${sku_sn}  ${plans.message}`);
  }

  if (plans.length == 0) {
    return null;
  }

  var plan = plans[0] || {};

  return plan.id;
}

function getSkuID(sku_sn) {
  var skus = Process("models.material.sku.Get", {
    select: ["id", "sku_sn"],
    wheres: [{ column: "sku_sn", value: sku_sn }],
  });

  if (skus.code && skus.code != 200) {
    console.log(`未找到单品数据 ${sku_sn} ${skus.message}`);
    throw new Error(`未找到单品数据 ${sku_sn}  ${skus.message}`);
  }
  return skus[0].id;
}

// 编码规则: 单品编码(8位) + 批次编码(6位) + 物品编码(10位)
// 解析编码
function ParseSN(sn) {
  sn = sn || "";
  if (sn == "") {
    throw new Error("未找到标签编码数据");
  }

  if (sn.length != 24) {
    throw new Error(`标签数据不合法: ${sn}`);
  }

  var sku_sn = sn.substring(0, 8);
  var plan_sn = sn.substring(8, 14);
  var item_sn = sn.substring(14, 24);
  return {
    sku_sn: sku_sn,
    plan_sn: plan_sn,
    item_sn: item_sn,
    sn: sn,
  };
}

/**
 * 大屏幕展示数据
 */
function Live() {
  var now = new Date();
  now.setSeconds(now.getSeconds() - 60); // 1分钟内的数据
  var timeAgo = now.toISOString().slice(0, 19).replace("T", " ");
  records = Process(
    "xiang.table.Search",
    "record.total",
    {
      select: ["id", "user_id", "uptime", "type"],
      wheres: [
        { column: "type", value: ["Income", "Leave"], op: "in" },
        { column: "uptime", value: timeAgo, op: "ge" },
      ],
      orders: [{ column: "uptime", option: "desc" }],
    },
    1,
    1
  );

  var data = { user: {}, items: [] };
  if (records.total == 0) {
    return data;
  }

  var user = records.data[0].user || {};

  // 处理照片
  if (user.photo != null && user.photo.length > 0) {
    user.photo = `/api/user/photo?file=${user.photo[0]}`;
  }
  user.action = records.data[0].type;
  data.user = user;

  items = Process(
    "xiang.table.Search",
    "record.total",
    {
      select: ["id", "uptime", "type", "sn"],
      wheres: [
        { column: "user_id", value: user.id },
        { column: "type", value: ["Enter", "Outdoor"], op: "in" },
        { column: "uptime", value: timeAgo, op: "ge" },
      ],
      orders: [{ column: "uptime", option: "desc" }],
    },
    1,
    5
  );

  for (var i = 0; i < items.data.length; i++) {
    var item = items.data[i] || {};
    var warehouse = item.warehouse || {};
    var plan = item.plan || {};
    var sn = ParseSN(item.sn);
    data.items.push({
      sn: sn.item_sn,
      name: item.sku_name,
      type: item.type,
      warehouse: warehouse.name,
      plan: plan.name,
    });
  }

  return data;
}
