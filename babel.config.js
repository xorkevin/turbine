const createConfig = (api) => {
  api.cache.never();
  return {
    presets: [
      '@babel/preset-react',
      [
        '@babel/env',
        {
          modules: false,
          useBuiltIns: false,
          targets: {
            browsers: [
              'last 2 Chrome versions',
              'last 2 Firefox versions',
              'last 1 Safari versions',
              'last 1 ChromeAndroid versions',
              'last 1 Edge versions',
            ],
          },
        },
      ],
    ],
  };
};

module.exports = createConfig;
