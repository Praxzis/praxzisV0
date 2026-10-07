const { withEntitlementsPlist } = require('expo/config-plugins');

/** Simulator builds cannot sign Apple Sign In. The Apple seal still uses browser OAuth. */
module.exports = function withoutAppleSignInEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['com.apple.developer.applesignin'];
    return config;
  });
};
