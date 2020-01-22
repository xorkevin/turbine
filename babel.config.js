const createConfig = (api) => {
  api.cache.never();
  return {
    presets: [
      '@babel/preset-react',
      [
        '@babel/preset-env',
        {
          modules: false,
          useBuiltIns: 'usage',
          corejs: 3,
          targets: {
            browsers: [
              'last 2 Chrome versions',
              'last 2 Firefox versions',
              'last 1 Safari versions',
            ],
          },
        },
      ],
    ],
  };
};

module.exports = createConfig;
