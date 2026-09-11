/**
 * One-off utilities run via `clasp run <function> --params '[...]'` from the
 * terminal — there's no CLI for Script Properties otherwise. Safe to keep
 * around; these only touch Script Properties, nothing user-facing.
 */

/** clasp run setScriptProperty --params '["META_ACCESS_TOKEN", "the-value"]' */
function setScriptProperty(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
  return 'Set ' + key + ' (' + String(value).length + ' chars)';
}

/** clasp run checkMetaConfig — confirms both are set without ever printing the token itself. */
function checkMetaConfig() {
  var config = getConfig_();
  var result = {
    pixelIdSet: !!config.metaPixelId,
    pixelId: config.metaPixelId,
    accessTokenSet: !!config.metaAccessToken,
    accessTokenLength: config.metaAccessToken.length,
    testEventCodeSet: !!config.metaTestEventCode
  };
  // The Apps Script editor's execution log only shows Logger output, not
  // return values — log it explicitly so Run > Executions actually shows this.
  Logger.log(JSON.stringify(result));
  return result;
}
