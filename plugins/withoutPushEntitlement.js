// expo-notifications adds the APNs entitlement automatically, which needs the Push Notifications
// capability on the App ID. Keep only schedules local reminders, which don't use APNs, so the
// entitlement is dropped. Remove this plugin (and rebuild interactively so EAS can enable the
// capability) when server-sent push notifications are added.
const { withEntitlementsPlist } = require('expo/config-plugins');

module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (c) => {
    delete c.modResults['aps-environment'];
    return c;
  });
};
