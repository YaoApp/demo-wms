/**
 * after:search Hook Spec tags
 * @param {} data
 * @returns
 */
function AfterSearch(response) {
  var data = response.data || [];
  for (var i in data) {
    var specs = data[i].specs || {};
    var specTags = [];
    for (var k in specs) {
      //   specTags.push({ label: `${k}: ${specs[k]}`, color: "#ff0000" });
      specTags.push(`${k}: ${specs[k]}`);
    }
    data[i]["spec_tags"] = specTags;
  }
  response["data"] = data;
  return response;
}

function WithsAfterSearch(response) {
  var data = response.data || [];
  for (var i in data) {
    var material = data[i].material || {};
    var sku = data[i].sku || {};
    var specs = sku.specs || {};
    var specTags = [];
    for (var k in specs) {
      //   specTags.push({ label: `${k}: ${specs[k]}`, color: "#ff0000" });
      specTags.push(`${k}: ${specs[k]}`);
    }
    data[i]["spec_tags"] = specTags;
    data[i]["sku_name"] = material.name;
    if (specTags.length > 0) {
      var label = specTags.join(", ");
      data[i]["sku_name"] = `${material.name} (${label})`;
    }
  }
  response["data"] = data;
  return response;
}

function SpecsToTags(specs) {
  var specTags = [];
  specs = specs || {};
  for (var k in specs) {
    specTags.push(`${k}: ${specs[k]}`);
  }
  return specTags;
}

function SpecsToLabel(specs) {
  var tags = SpecsToTags(specs);
  return tags.join(", ");
}

function WithFullName(data, field) {
  data = data || [];
  for (var i in data) {
    var name = data[i][field] || "";
    var specs = data[i]["specs"] || {};
    if (name == "") {
      continue;
    }
    var label = SpecsToLabel(specs);
    if (label != "") {
      data[i][field] = `${name} (${label})`;
    }
  }
  return data;
}

/**
 * after:find Specs
 * @param {} data
 * @returns
 */
function AfterFind(response) {
  var specs_list = [];
  var specs = response.specs || {};

  // 加载默认值
  var defaults = DefaultSpecs(response.material_id);
  for (var i in defaults) {
    var name = defaults[i].name || "";
    if (name == "") {
      continue;
    }
    if (specs[name] === undefined) {
      specs[name] = null;
    }
  }

  var names = [];
  for (var name in specs) {
    names.push(name);
  }

  names.sort();
  for (var i in names) {
    var name = names[i];
    specs_list.push({ name: name, value: specs[name] || "" });
  }

  response["specs_list"] = specs_list;
  response["spec_defaults"] = defaults;
  return response;
}

function DefaultSpecs(material_id) {
  var specs = Process("models.material.spec.Get", {
    select: ["id", "name", "values"],
    wheres: [{ column: "material_id", value: material_id }],
    limit: 50,
  });
  return specs;
}
