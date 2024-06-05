import { defineConfig } from "vite";
import jison from "jison";

const transformJison = (grammer: string): string => {
  const parser = new jison.Generator(grammer, {
    moduleType: "js",
    "token-stack": true,
  });
  const source = parser.generate({ moduleMain: "() => {}" });
  const exporter = `
	export { parser };
	export default parser;
	`;
  return `${source} ${exporter}`;
};

const jisonPlugin = () => {
  const FILE_REGEX = /\.(jison)$/;
  return {
    name: "jisonPlugin",
    transform(src: string, id: string) {
      if (FILE_REGEX.test(id)) {
        return {
          code: transformJison(src),
          map: null, // provide source map if available
        };
      }
    },
  };
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [jisonPlugin()],
  server: {
    watch: {
      usePolling: true,
    },
  },
});
