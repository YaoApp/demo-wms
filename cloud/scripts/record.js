/**
 * After Save: Update Stocks
 * @param {*} id
 * @param {*} payload
 */
function AfterSave(id, payload) {
  var status = payload.status || "";
  var type = payload.type || "";

  // 忽略处理录入信息
  if (status == "Create") {
    return id;
  }

  switch (type) {
    case "Enter":
      return Put(id, payload);
    case "Outdoor":
      return Out(id, payload);
  }
  return id;
}

/**
 * Unique ID
 * @param {}} payload
 */
function BeforeSave(payload) {
  payload = payload || {};
  var time = (new Date().getTime() / 1000 / 60).toFixed(0);
  payload["unique_id"] = `${time} || ${payload.warehouse_id || ""}|${
    payload.type || ""
  }|${payload.plan_id || ""}|${payload.sku_id || ""}|${payload.sn || ""}|${
    payload.user_id || ""
  }`;
  return [payload];
}

// Input
// yao run scripts.record.Put 2 '::{"id":"2","plan_id":1,"remark":null,"sku_id":1,"sn":"100000012021123642243533","status":"Effect","type":"Enter","uptime":"2021-12-15T10:38:25+08:00","user_id":1,"warehouse_id":1}'
// yao run scripts.record.Put 2 '::{"id":"2","plan_id":1,"remark":null,"sku_id":1,"sn":"100000023642243533","status":"Effect","type":"Enter","uptime":"2021-12-15T10:38:25+08:00","user_id":1,"warehouse_id":1}'
function Put(id, payload) {
  var sn = payload.sn || "";
  if (payload.sn == "") {
    throw new Error("未找到标签编码数据");
  }

  if (sn.length != 24) {
    throw new Error(`标签数据不合法: ${sn}`);
  }

  UpdateStock(payload.warehouse_id, payload.sku_id);
  UpdatePlanAmount(payload.plan_id, payload.sku_id);
  return id;
}

// Output
function Out(id, payload) {
  var sn = payload.sn || "";
  if (payload.sn == "") {
    throw new Error("未找到标签编码数据");
  }

  if (sn.length != 24) {
    throw new Error(`标签数据不合法: ${sn}`);
  }

  ArchiveItem(payload.sn, payload.status);
  UpdateStock(payload.warehouse_id, payload.sku_id);
  return id;
}

// Archive Items
function ArchiveItem(sn, status) {
  if (status != "Effect" && status != "Archive") {
    return;
  }

  if (sn == undefined) {
    throw new Error("缺少物资数据编码");
  }

  var effect = Process(
    "models.record.UpdateWhere",
    {
      wheres: [{ column: "sn", value: sn }],
    },
    { status: "Archive" }
  );

  if (effect == 0) {
    throw new Error(`归档入库资料失败 sn=${sn}`);
  }
}

// Update SKU
function UpdatePlanAmount(plan_id, sku_id) {
  if (sku_id == undefined) {
    throw new Error("缺少单品数据ID");
  }

  if (plan_id == undefined) {
    throw new Error("缺少计划数据ID");
  }

  // Query Stock
  var stock = Process("flows.plan.stock", plan_id, sku_id);

  // Update Stock
  var effect = Process(
    "models.plan.item.UpdateWhere",
    {
      wheres: [
        { column: "sku_id", value: sku_id },
        { column: "plan_id", value: plan_id },
      ],
    },
    { amount: stock, uptime: new Date().toISOString() }
  );

  if (effect == 0) {
    throw new Error(
      `更新计划已完成数量失败 plan_id=${plan_id} sku_id=${sku_id} amount=${stock}`
    );
  }
}

// Update Stock
function UpdateStock(warehouse_id, sku_id) {
  if (sku_id == undefined) {
    throw new Error("缺少单品数据ID");
  }

  if (warehouse_id == undefined) {
    throw new Error("缺少所在仓库数据ID");
  }

  // Query
  var stock = Process("flows.stock.count", sku_id);

  // Update SKU
  var effect = Process(
    "models.stock.UpdateWhere",
    {
      wheres: [
        { column: "sku_id", value: sku_id },
        { column: "warehouse_id", value: warehouse_id },
      ],
    },
    { stock: stock, uptime: new Date().toISOString() }
  );

  // Save stock
  if (effect == 0) {
    stock_id = Process("models.stock.Create", {
      warehouse_id: warehouse_id,
      sku_id: sku_id,
      stock: stock,
      uptime: new Date().toISOString(),
    });
    if (stock_id < 1) {
      throw new Error(
        `更新库存失败 warehouse_id=${warehouse_id} sku_id=${sku_id} stock=${stock}`
      );
    }
  }
}

// SN Rules: SKU(8) + Plan(6) + Item(10)
// Parse SN
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
