/******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 836:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const xml2js = __nccwpck_require__(251);
const core = __nccwpck_require__(974);
const { getContent } = __nccwpck_require__(776);

// return parsed xml
const getParsedXml = (options) => {
  const content = getContent(options.xmlFile);

  if (content) {
    return getSummary(content);
  }

  return '';
};

// return summary report in markdown format
const getSummaryReport = (options) => {
  try {
    const parsedXml = getParsedXml(options);

    if (parsedXml) {
      return toMarkdown(parsedXml, options);
    }
  } catch (error) {
    core.error(`Error generating summary report. ${error.message}`);
  }

  return '';
};

// get summary from junitxml
const getSummary = (data) => {
  if (!data || !data.length) {
    return null;
  }

  const parser = new xml2js.Parser();

  const parsed = parser.parseString(data);
  if (!parsed) {
    core.warning(`JUnitXml file is not XML or not well-formed`);
    return '';
  }

  const summary = { errors: 0, failures: 0, skipped: 0, tests: 0, time: 0 };
  for (const testsuite of parser.resultObject.testsuites.testsuite) {
    const { errors, failures, skipped, tests, time } = testsuite['$'];
    summary.errors += +errors;
    summary.failures += +failures;
    summary.skipped += +skipped;
    summary.tests += +tests;
    summary.time += +time;
  }
  return summary;
};

const getTestCases = (data) => {
  if (!data || !data.length) {
    return null;
  }

  const parser = new xml2js.Parser();

  const parsed = parser.parseString(data);
  if (!parsed) {
    core.warning(`JUnitXml file is not XML or not well-formed`);
    return '';
  }

  return parser.resultObject.testsuites.testsuite.map((t) => t.testcase).flat();
};

const getNotSuccessTest = (options) => {
  const initData = { count: 0, failures: [], errors: [], skipped: [] };

  try {
    const content = getContent(options.xmlFile);

    if (content) {
      const testCaseToOutput = (testcase) => {
        const { classname, name } = testcase['$'];
        return { classname, name };
      };

      const testcases = getTestCases(content);

      const failures = testcases.filter((t) => t.failure).map(testCaseToOutput);
      const errors = testcases.filter((t) => t.error).map(testCaseToOutput);
      const skipped = testcases.filter((t) => t.skipped).map(testCaseToOutput);

      return {
        failures,
        errors,
        skipped,
        count: failures.length + errors.length + skipped.length,
      };
    }
  } catch (error) {
    core.warning(
      `Could not get notSuccessTestInfo successfully. ${error.message}`,
    );
  }

  return initData;
};

// convert summary from junitxml to md
const toMarkdown = (summary, options) => {
  const { errors, failures, skipped, tests, time } = summary;
  const displayTime =
    time > 60 ? `${(time / 60) | 0}m ${time % 60 | 0}s` : `${time.toFixed(3)}s`;
  const table = `| Tests | Skipped | Failures | Errors | Time |
| ----- | ------- | -------- | -------- | ------------------ |
| ${tests} | ${skipped} :zzz: | ${failures} :x: | ${errors} :fire: | ${displayTime} :stopwatch: |
`;

  if (options.xmlTitle) {
    return `## ${options.xmlTitle}
${table}`;
  }

  return table;
};

module.exports = { getSummaryReport, getParsedXml, getNotSuccessTest };


/***/ }),

/***/ 721:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const { getCoverageReport } = __nccwpck_require__(74);
const { getParsedXml } = __nccwpck_require__(836);
const core = __nccwpck_require__(974);

// parse oneline from multiple files to object
const parseLine = (line) => {
  if (!line || !line.includes(',')) {
    return '';
  }

  const lineArr = line.split(',');

  return {
    title: lineArr[0].trim(),
    covFile: lineArr[1].trim(),
    xmlFile: lineArr.length > 2 ? lineArr[2].trim() : '',
  };
};

// make internal options
const getOptions = (options = {}, line = {}) => ({
  ...options,
  title: line.title,
  covFile: line.covFile,
  hideReport: true,
  xmlFile: line.xmlFile,
  xmlTitle: '',
});

// return multiple report in markdown format
const getMultipleReport = (options) => {
  const { multipleFiles, defaultBranch } = options;

  try {
    const lineReports = multipleFiles.map(parseLine).filter((l) => l);
    const hasXmlReports = lineReports.some((l) => l.xmlFile);
    const miniTable = `| Title | Coverage |
| ----- | ----- |
`;
    const fullTable = `| Title | Coverage | Tests | Skipped | Failures | Errors | Time |
| ----- | ----- | ----- | ------- | -------- | -------- | ------------------ |
`;
    let table = hasXmlReports ? fullTable : miniTable;

    lineReports.forEach((l, i) => {
      const internalOptions = getOptions(options, l);
      const coverage = getCoverageReport(internalOptions);
      const summary = getParsedXml(internalOptions);

      if (coverage.html) {
        table += `| ${l.title} | ${coverage.html}`;

        if (i === 0) {
          core.startGroup(internalOptions.covFile);
          core.info(`coverage: ${coverage.coverage}`);
          core.info(`color: ${coverage.color}`);
          core.info(`warnings: ${coverage.warnings}`);
          core.endGroup();

          core.setOutput('coverage', coverage.coverage);
          core.setOutput('color', coverage.color);
          core.setOutput('warnings', coverage.warnings);

          const newOptions = { ...internalOptions, commit: defaultBranch };
          const output = getCoverageReport(newOptions);
          core.setOutput('coverageHtml', output.html);

          if (summary) {
            const { errors, failures, skipped, tests, time } = summary;
            const valuesToExport = { errors, failures, skipped, tests, time };

            core.startGroup(internalOptions.xmlFile);
            Object.entries(valuesToExport).forEach(([key, value]) => {
              core.setOutput(key, value);
              core.info(`${key}: ${value}`);
            });
            core.endGroup();
          }
        }
      } else if (summary) {
        table += `| ${l.title} |  `;
      }

      if (hasXmlReports && summary) {
        const { errors, failures, skipped, tests, time } = summary;
        const displayTime =
          time > 60 ? `${(time / 60) | 0}m ${time % 60 | 0}s` : `${time}s`;
        table += `| ${tests} | ${skipped} :zzz: | ${failures} :x: | ${errors} :fire: | ${displayTime} :stopwatch: |
`;
      } else {
        table += `
`;
      }
    });

    return table;
  } catch (error) {
    core.error(`Error generating summary report. ${error.message}`);
  }

  return '';
};

module.exports = { getMultipleReport };


/***/ }),

/***/ 74:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const core = __nccwpck_require__(974);
const { getPathToFile, getContentFile, getCoverageColor } = __nccwpck_require__(776);

// return true if "coverage file" include all special words
const isValidCoverageContent = (data) => {
  if (!data || !data.length) {
    return false;
  }

  const wordsToInclude = [
    'coverage: platform',
    'Stmts',
    'Miss',
    'Cover',
    'TOTAL',
  ];

  return wordsToInclude.every((w) => data.includes(w));
};

// return full html coverage report and coverage percentage
const getCoverageReport = (options) => {
  const { covFile, covXmlFile } = options;

  if (!covXmlFile) {
    try {
      const covFilePath = getPathToFile(covFile);
      const content = getContentFile(covFilePath);
      const coverage = getTotalCoverage(content);
      const isValid = isValidCoverageContent(content);

      if (content && !isValid) {
        // prettier-ignore
        core.error(`Coverage file "${covFilePath}" has bad format or wrong data`);
      }

      if (content && isValid) {
        const html = toHtml(content, options);
        const total = getTotal(content);
        const warnings = getWarnings(content);
        const color = getCoverageColor(total ? total.cover : '0');

        return { html, coverage, color, warnings };
      }
    } catch (error) {
      core.error(`Generating coverage report. ${error.message}`);
    }
  }

  return { html: '', coverage: '0', color: 'red', warnings: 0 };
};

// get actual lines from coverage-file
const getActualLines = (data) => {
  if (!data || !data.length) {
    return null;
  }

  const lines = data.split('\n');
  const startIndex = lines.findIndex((l) => l.includes('coverage: platform'));
  const endIndex = lines.findIndex((l) => l.includes('TOTAL '));
  if (startIndex === -1) {
    return null;
  }

  const oldFormatLines = lines.slice(startIndex + 3, endIndex - 1);
  const newFormatLines = oldFormatLines.filter(
    (l) => !l.split('').every((c) => c === '-'),
  );

  return newFormatLines;
};

// get total line from coverage-file
const getTotal = (data) => {
  if (!data || !data.length) {
    return null;
  }

  const lines = data.split('\n');
  const line = lines.find((l) => l.includes('TOTAL    '));

  return parseTotalLine(line);
};

// get number of warnings from coverage-file
const getWarnings = (data) => {
  if (!data || !data.length) {
    return null;
  }

  const WARNINGS_KEY = ' warnings in ';
  if (!data.includes(WARNINGS_KEY)) {
    return 0;
  }

  const line = data.split('\n').find((l) => l.includes(WARNINGS_KEY));
  const lineArr = line.split(' ');
  const indexOfWarnings = lineArr.findIndex((i) => i === 'warnings');

  return parseInt(lineArr[indexOfWarnings - 1]);
};

// parse one line from coverage-file
const parseOneLine = (line) => {
  if (!line) {
    return null;
  }

  const parsedLine = line.split('   ').filter((l) => l);

  if (parsedLine.length < 4) {
    return null;
  }

  const lastItem = parsedLine[parsedLine.length - 1];
  const isFullCoverage = lastItem === '100%';
  const cover = isFullCoverage
    ? '100%'
    : parsedLine[parsedLine.length - 2].trim();
  const missing = isFullCoverage
    ? null
    : parsedLine[parsedLine.length - 1] &&
      parsedLine[parsedLine.length - 1].split(', ');

  return {
    name: parsedLine[0],
    stmts: parsedLine[1].trim(),
    miss: parsedLine[2].trim(),
    cover,
    missing,
  };
};

// parse total line from coverage-file
const parseTotalLine = (line) => {
  if (!line) {
    return null;
  }

  const parsedLine = line.split('  ').filter((l) => l);

  if (parsedLine.length < 4) {
    return null;
  }

  return {
    name: parsedLine[0],
    stmts: parsedLine[1].trim(),
    miss: parsedLine[2].trim(),
    cover: parsedLine[parsedLine.length - 1].trim(),
  };
};

// parse coverage-file
const parse = (data) => {
  const actualLines = getActualLines(data);

  if (!actualLines) {
    return null;
  }

  return actualLines.map(parseOneLine);
};

// collapse all lines to folders structure
const makeFolders = (coverage, options) => {
  const folders = {};

  for (const line of coverage) {
    const parts = line.name.replace(options.prefix, '').split('/');
    const folder = parts.slice(0, -1).join('/');

    folders[folder] = folders[folder] || [];
    folders[folder].push(line);
  }

  return folders;
};

// gets total coverage in percentage
const getTotalCoverage = (data) => {
  const total = getTotal(data);

  return total ? total.cover : '0';
};

// convert all data to html output
const toHtml = (data, options, dataFromXml = null) => {
  const {
    badgeTitle,
    title,
    hideBadge,
    hideReport,
    reportOnlyChangedFiles,
    removeLinkFromBadge,
  } = options;
  const table = hideReport ? '' : toTable(data, options, dataFromXml);
  const total = dataFromXml ? dataFromXml.total : getTotal(data);
  const color = getCoverageColor(total.cover);
  const onlyChnaged = reportOnlyChangedFiles ? '• ' : '';
  const readmeHref = `${options.repoUrl}/blob/${options.commit}/README.md`;
  const badge = `<img alt="${badgeTitle}" src="https://img.shields.io/badge/${badgeTitle}-${total.cover}25-${color}.svg" />`;
  const badgeWithLink = removeLinkFromBadge
    ? badge
    : `<a href="${readmeHref}">${badge}</a>`;
  const badgeHtml = hideBadge ? '' : badgeWithLink;
  const reportHtml = hideReport
    ? ''
    : `<details><summary>${title} ${onlyChnaged}</summary>${table}</details>`;

  return `${badgeHtml}${reportHtml}`;
};

// make html table from coverage-file
const toTable = (data, options, dataFromXml = null) => {
  const coverage = dataFromXml ? dataFromXml.coverage : parse(data);
  const { reportOnlyChangedFiles, changedFiles } = options;

  if (!coverage) {
    core.warning(`Coverage file not well-formed`);
    return null;
  }
  const totalLine = dataFromXml ? dataFromXml.total : getTotal(data);
  options.hasMissing = coverage.some((c) => c.missing);

  core.info(`Generating coverage report`);
  const headTr = toHeadRow(options);
  const totalTr = toTotalRow(totalLine, options);
  const folders = makeFolders(coverage, options);

  const rows = Object.keys(folders)
    .sort()
    .filter((folderPath) => {
      if (!reportOnlyChangedFiles) {
        return true;
      }

      const allFilesInFolder = Object.values(folders[folderPath]).map(
        (f) => f.name,
      );

      folders[folderPath] = folders[folderPath].filter((f) =>
        changedFiles.all.some((c) => c.includes(f.name)),
      );
      const fileExistsInFolder = allFilesInFolder.some((f) =>
        changedFiles.all.some((c) => c.includes(f)),
      );
      return fileExistsInFolder;
    })
    .reduce(
      (acc, key) => [
        ...acc,
        toFolderTd(key, options),
        ...folders[key].map((file) => toRow(file, key !== '', options)),
      ],
      [],
    );

  const hasLines = rows.length > 0;
  const isFilesChanged =
    reportOnlyChangedFiles && !hasLines
      ? `<i>report-only-changed-files is enabled. No files were changed during this commit :)</i>`
      : '';

  // prettier-ignore
  return `<table>${headTr}<tbody>${rows.join('')}${totalTr}</tbody></table>${isFilesChanged}`;
};

// make html head row - th
const toHeadRow = (options) => {
  const lastTd = options.hasMissing ? '<th>Missing</th>' : '';

  return `<tr><th>File</th><th>Stmts</th><th>Miss</th><th>Cover</th>${lastTd}</tr>`;
};

// make html row - tr
const toRow = (item, indent = false, options) => {
  const { stmts, miss, cover } = item;

  const name = toFileNameTd(item, indent, options);
  const missing = toMissingTd(item, options);
  const lastTd = options.hasMissing ? `<td>${missing}</td>` : '';

  return `<tr><td>${name}</td><td>${stmts}</td><td>${miss}</td><td>${cover}</td>${lastTd}</tr>`;
};

// make summary row - tr
const toTotalRow = (item, options) => {
  const { name, stmts, miss, cover } = item;
  const emptyCell = options.hasMissing ? '<td>&nbsp;</td>' : '';

  return `<tr><td><b>${name}</b></td><td><b>${stmts}</b></td><td><b>${miss}</b></td><td><b>${cover}</b></td>${emptyCell}</tr>`;
};

// make fileName cell - td
const toFileNameTd = (item, indent = false, options) => {
  const relative = item.name.replace(options.prefix, '');
  const href = `${options.repoUrl}/blob/${options.commit}/${options.pathPrefix}${relative}`;
  const parts = relative.split('/');
  const last = parts[parts.length - 1];
  const space = indent ? '&nbsp; &nbsp;' : '';

  return `${space}<a href="${href}">${last.replace(/__/g, '\\_\\_')}</a>`;
};

// make folder row - tr
const toFolderTd = (path, options) => {
  if (path === '') {
    return '';
  }

  const colspan = options.hasMissing ? 5 : 4;
  return `<tr><td colspan="${colspan}"><b>${path}</b></td></tr>`;
};

// make missing cell - td
const toMissingTd = (item, options) => {
  if (!item.missing || !item.missing.length) {
    return '&nbsp;';
  }

  return item.missing
    .map((range) => {
      const [start, end = start] = range.split('-');
      const fragment = start === end ? `L${start}` : `L${start}-L${end}`;
      const relative = item.name;
      const href = `${options.repoUrl}/blob/${options.commit}/${options.pathPrefix}${relative}#${fragment}`;
      const text = start === end ? start : `${start}&ndash;${end}`;

      return `<a href="${href}">${text}</a>`;
    })
    .join(', ');
};

module.exports = { getCoverageReport, getCoverageColor, toTable, toHtml };


/***/ }),

/***/ 501:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const xml2js = __nccwpck_require__(251);
const core = __nccwpck_require__(974);
const { getContent, getCoverageColor } = __nccwpck_require__(776);
const { toHtml } = __nccwpck_require__(74);

// return parsed xml
const getParsedXml = (options) => {
  const content = getContent(options.covXmlFile);

  if (content) {
    return getXmlContent(content);
  }

  return '';
};

const getTotalCoverage = (parsedXml) => {
  if (!parsedXml) {
    return null;
  }

  const coverage = parsedXml['$'];
  const cover = parseInt(parseFloat(coverage['line-rate']) * 100);
  const linesValid = parseInt(coverage['lines-valid']);
  const linesCovered = parseInt(coverage['lines-covered']);

  return {
    name: 'TOTAL',
    stmts: linesValid,
    miss: linesValid - linesCovered,
    cover: cover !== '0' ? `${cover}%` : '0',
  };
};

// return true if "coverage file" include right structure
const isValidCoverageContent = (parsedXml) => {
  if (!parsedXml || !parsedXml.packages || !parsedXml.packages.length) {
    return false;
  }

  const { packages } = parsedXml;
  if (!packages[0] || !packages[0].package || !packages[0].package.length) {
    return false;
  }

  return true;
};

// return summary report in markdown format
const getCoverageXmlReport = (options) => {
  try {
    const parsedXml = getParsedXml(options);

    const coverage = getTotalCoverage(parsedXml);
    // const coverage = getCoverageReportXml(getContent(options.covXmlFile));
    const isValid = isValidCoverageContent(parsedXml);

    if (parsedXml && !isValid) {
      // prettier-ignore
      core.error(`Error: coverage file "${options.covXmlFile}" has bad format or wrong data`);
    }

    if (parsedXml && isValid) {
      const coverageObj = coverageXmlToFiles(parsedXml, options.xmlSkipCovered);
      const dataFromXml = { coverage: coverageObj, total: coverage };
      const html = toHtml(null, options, dataFromXml);
      const color = getCoverageColor(coverage ? coverage.cover : '0');

      return { html, coverage, color };
    }
    return null;
  } catch (error) {
    // prettier-ignore
    core.error(`Error generating coverage report from "${options.covXmlFile}". ${error.message}`);
  }

  return '';
};

// get content from coverage xml
const getXmlContent = (data) => {
  try {
    if (!data || !data.length) {
      return null;
    }

    const parser = new xml2js.Parser();

    const parsed = parser.parseString(data);
    if (!parsed || !parser.resultObject) {
      core.warning(`Coverage xml file is not XML or not well-formed`);
      return '';
    }

    return parser.resultObject.coverage;
  } catch (error) {
    core.error(`Error parsing coverage xml. ${error.message}`);
  }

  return '';
};

// parse coverage xml to Files structure
const coverageXmlToFiles = (coverageXml, xmlSkipCovered) => {
  let files = [];

  coverageXml.packages[0].package
    .filter((package) => package.classes && package.classes.length)
    .forEach((package) => {
      package.classes[0].class
        .filter((c) => c.lines)
        .forEach((c) => {
          const fileObj = parseClass(c, xmlSkipCovered);

          if (fileObj) {
            files.push(fileObj);
          }
        });
    });

  return files;
};

const parseClass = (classObj, xmlSkipCovered) => {
  if (!classObj || !classObj.lines) {
    return null;
  }

  const { stmts, missing, totalMissing: miss } = parseLines(classObj.lines);
  const { filename: name, 'line-rate': lineRate } = classObj['$'];
  const isFullCoverage = lineRate === '1';

  if (xmlSkipCovered && isFullCoverage) {
    return null;
  }

  const cover = isFullCoverage
    ? '100%'
    : `${parseInt(parseFloat(lineRate) * 100)}%`;

  return { name, stmts, miss, cover, missing };
};

const parseLines = (lines) => {
  if (!lines || !lines.length || !lines[0].line) {
    return { stmts: '0', missing: '', totalMissing: '0' };
  }

  let stmts = 0;
  const missingLines = [];

  lines[0].line.forEach((line) => {
    stmts++;
    const { hits, number } = line['$'];

    if (hits === '0') {
      missingLines.push(parseInt(number));
    }
  });

  const missing = missingLines.reduce((arr, val, i, a) => {
    if (!i || val !== a[i - 1] + 1) arr.push([]);
    arr[arr.length - 1].push(val);
    return arr;
  }, []);

  const missingText = [];
  missing.forEach((m) => {
    if (m.length === 1) {
      missingText.push(`${m[0]}`);
    } else {
      missingText.push(`${m[0]}-${m[m.length - 1]}`);
    }
  });

  return {
    stmts: stmts.toString(),
    missing: missingText,
    totalMissing: missingLines.length.toString(),
  };
};

module.exports = { getCoverageXmlReport };


/***/ }),

/***/ 776:
/***/ ((module, __unused_webpack_exports, __nccwpck_require__) => {

const fs = __nccwpck_require__(896);
const core = __nccwpck_require__(974);

const getPathToFile = (pathToFile) => {
  if (!pathToFile) {
    return null;
  }

  // supports absolute path like '/tmp/pytest-coverage.txt'
  return pathToFile.startsWith('/')
    ? pathToFile
    : `${process.env.GITHUB_WORKSPACE}/${pathToFile}`;
};

const getContentFile = (pathToFile) => {
  if (!pathToFile) {
    return null;
  }

  const fileExists = fs.existsSync(pathToFile);

  if (!fileExists) {
    core.warning(`File "${pathToFile}" doesn't exist`);
    return null;
  }

  const content = fs.readFileSync(pathToFile, 'utf8');

  if (!content) {
    core.warning(`No content found in file "${pathToFile}"`);
    return null;
  }

  core.info(`File read successfully "${pathToFile}"`);
  return content;
};

const getContent = (filePath) => {
  try {
    const fullFilePath = getPathToFile(filePath);

    if (fullFilePath) {
      const content = getContentFile(fullFilePath);

      return content;
    }
  } catch (error) {
    core.error(`Could not get content of "${filePath}". ${error.message}`);
  }

  return null;
};

// get coverage color from coverage percentage
const getCoverageColor = (percentage) => {
  // https://shields.io/category/coverage
  const rangeColors = [
    {
      color: 'red',
      range: [0, 40],
    },
    {
      color: 'orange',
      range: [40, 60],
    },
    {
      color: 'yellow',
      range: [60, 80],
    },
    {
      color: 'green',
      range: [80, 90],
    },
    {
      color: 'brightgreen',
      range: [90, 101],
    },
  ];

  const num = parseFloat(percentage);

  const { color } =
    rangeColors.find(({ range: [min, max] }) => num >= min && num < max) ||
    rangeColors[0];

  return color;
};

module.exports = {
  getPathToFile,
  getContentFile,
  getContent,
  getCoverageColor,
};


/***/ }),

/***/ 974:
/***/ ((module) => {

module.exports = eval("require")("@actions/core");


/***/ }),

/***/ 858:
/***/ ((module) => {

module.exports = eval("require")("@actions/github");


/***/ }),

/***/ 251:
/***/ ((module) => {

module.exports = eval("require")("xml2js");


/***/ }),

/***/ 896:
/***/ ((module) => {

"use strict";
module.exports = require("fs");

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __nccwpck_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		var threw = true;
/******/ 		try {
/******/ 			__webpack_modules__[moduleId](module, module.exports, __nccwpck_require__);
/******/ 			threw = false;
/******/ 		} finally {
/******/ 			if(threw) delete __webpack_module_cache__[moduleId];
/******/ 		}
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/compat */
/******/ 	
/******/ 	if (typeof __nccwpck_require__ !== 'undefined') __nccwpck_require__.ab = __dirname + "/";
/******/ 	
/************************************************************************/
var __webpack_exports__ = {};
const core = __nccwpck_require__(974);
const github = __nccwpck_require__(858);
const { getCoverageReport } = __nccwpck_require__(74);
const { getCoverageXmlReport } = __nccwpck_require__(501);
const {
  getSummaryReport,
  getParsedXml,
  getNotSuccessTest,
} = __nccwpck_require__(836);
const { getMultipleReport } = __nccwpck_require__(721);

const MAX_COMMENT_LENGTH = 65536;
const FILE_STATUSES = Object.freeze({
  ADDED: 'added',
  MODIFIED: 'modified',
  REMOVED: 'removed',
  RENAMED: 'renamed',
});

const createOrEditComment = async (
  octokit,
  repo,
  owner,
  issue_number,
  body,
  WATERMARK,
) => {
  // Now decide if we should issue a new comment or edit an old one
  const { data: comments } = await octokit.issues.listComments({
    repo,
    owner,
    issue_number,
  });

  const comment = comments.find((c) => c.body.startsWith(WATERMARK));

  if (comment) {
    core.info('Found previous comment, updating');
    await octokit.issues.updateComment({
      repo,
      owner,
      comment_id: comment.id,
      body,
    });
  } else {
    core.info('No previous comment found, creating a new one');
    await octokit.issues.createComment({
      repo,
      owner,
      issue_number,
      body,
    });
  }
};

const main = async () => {
  const token = core.getInput('github-token', { required: true });
  const title = core.getInput('title', { required: false });
  const badgeTitle = core.getInput('badge-title', { required: false });
  const hideBadge = core.getBooleanInput('hide-badge', { required: false });
  const hideReport = core.getBooleanInput('hide-report', { required: false });
  const createNewComment = core.getBooleanInput('create-new-comment', {
    required: false,
  });
  const hideComment = core.getBooleanInput('hide-comment', { required: false });
  const xmlSkipCovered = core.getBooleanInput('xml-skip-covered', {
    required: false,
  });
  const reportOnlyChangedFiles = core.getBooleanInput(
    'report-only-changed-files',
    { required: false },
  );
  const removeLinkFromBadge = core.getBooleanInput('remove-link-from-badge', {
    required: false,
  });
  const uniqueIdForComment = core.getInput('unique-id-for-comment', {
    required: false,
  });
  const defaultBranch = core.getInput('default-branch', { required: false });
  const covFile = core.getInput('pytest-coverage-path', { required: false });
  const issueNumberInput = core.getInput('issue-number', { required: false });
  const covXmlFile = core.getInput('pytest-xml-coverage-path', {
    required: false,
  });
  const pathPrefix = core.getInput('coverage-path-prefix', { required: false });
  const xmlFile = core.getInput('junitxml-path', { required: false });
  const xmlTitle = core.getInput('junitxml-title', { required: false });
  const multipleFiles = core.getMultilineInput('multiple-files', {
    required: false,
  });
  const { context, repository } = github;
  const { repo, owner } = context.repo;
  const { eventName, payload } = context;
  const watermarkUniqueId = uniqueIdForComment
    ? `| ${uniqueIdForComment} `
    : '';
  const WATERMARK = `<!-- Pytest Coverage Comment: ${context.job} ${watermarkUniqueId}-->\n`;
  let finalHtml = '';

  const options = {
    token,
    repository: repository || `${owner}/${repo}`,
    prefix: `${process.env.GITHUB_WORKSPACE}/`,
    pathPrefix,
    covFile,
    covXmlFile,
    xmlFile,
    title,
    badgeTitle,
    hideBadge,
    hideReport,
    createNewComment,
    hideComment,
    xmlSkipCovered,
    reportOnlyChangedFiles,
    removeLinkFromBadge,
    defaultBranch,
    xmlTitle,
    multipleFiles,
  };

  options.repoUrl =
    payload.repository?.html_url || `https://github.com/${options.repository}`;

  if (eventName === 'pull_request' || eventName === 'pull_request_target') {
    options.commit = payload.pull_request.head.sha;
    options.head = payload.pull_request.head.ref;
    options.base = payload.pull_request.base.ref;
  } else if (eventName === 'push') {
    options.commit = payload.after;
    options.head = context.ref;
  } else if (eventName === 'workflow_dispatch') {
    options.commit = context.sha;
    options.head = context.ref;
  } else if (eventName === 'workflow_run') {
    options.commit = payload.workflow_run.head_sha;
    options.head = payload.workflow_run.head_branch;
  }

  if (options.reportOnlyChangedFiles) {
    const changedFiles = await getChangedFiles(options, issueNumberInput);
    options.changedFiles = changedFiles;

    // when github event is different from `pull_request`, `workflow_dispatch`, `workflow_run` or `push`
    if (!changedFiles) {
      options.reportOnlyChangedFiles = false;
    }
  }

  let report = options.covXmlFile
    ? getCoverageXmlReport(options)
    : getCoverageReport(options);
  const { coverage, color, html, warnings } = report;
  const summaryReport = getSummaryReport(options);

  if (summaryReport && summaryReport.html) {
    core.setOutput('coverageHtml', summaryReport.html);
  }

  if (html) {
    const newOptions = { ...options, commit: defaultBranch };
    const output = getCoverageReport(newOptions);
    core.setOutput('coverageHtml', output.html);
  }

  // set to output junitxml values
  if (summaryReport) {
    const parsedXml = getParsedXml(options);
    const { errors, failures, skipped, tests, time } = parsedXml;
    const valuesToExport = { errors, failures, skipped, tests, time };

    Object.entries(valuesToExport).forEach(([key, value]) => {
      core.info(`${key}: ${value}`);
      core.setOutput(key, value);
    });

    const notSuccessTestInfo = getNotSuccessTest(options);
    core.setOutput('notSuccessTestInfo', JSON.stringify(notSuccessTestInfo));
    core.setOutput('summaryReport', JSON.stringify(summaryReport));
  }

  let multipleFilesHtml = '';
  if (multipleFiles && multipleFiles.length) {
    multipleFilesHtml = `\n\n${getMultipleReport(options)}`;
  }

  if (
    !options.hideReport &&
    html.length + summaryReport.length > MAX_COMMENT_LENGTH &&
    eventName != 'workflow_dispatch' &&
    eventName != 'workflow_run'
  ) {
    // generate new html without report
    // prettier-ignore
    core.warning(`Your comment is too long (maximum is ${MAX_COMMENT_LENGTH} characters), coverage report will not be added.`);
    // prettier-ignore
    core.warning(`Try add: "--cov-report=term-missing:skip-covered", or add "hide-report: true", or add "report-only-changed-files: true", or switch to "multiple-files" mode`);
    report = getSummaryReport({ ...options, hideReport: true });
  }

  finalHtml += html;
  finalHtml += finalHtml.length ? `\n\n${summaryReport}` : summaryReport;
  finalHtml += multipleFilesHtml
    ? `\n\n${multipleFilesHtml}`
    : multipleFilesHtml;
  core.setOutput('summaryReport', JSON.stringify(finalHtml));

  if (coverage && typeof coverage === 'string') {
    core.startGroup(options.covFile);
    core.info(`coverage: ${coverage}`);
    core.info(`color: ${color}`);
    core.info(`warnings: ${warnings}`);

    core.setOutput('coverage', coverage);
    core.setOutput('color', color);
    core.setOutput('warnings', warnings);
    core.endGroup();
  }

  // support for output for `pytest-xml-coverage-path`
  if (coverage && coverage.cover) {
    core.startGroup(options.covXmlFile);
    core.info(`coverage: ${coverage.cover}`);
    core.info(`color: ${color}`);

    core.setOutput('coverage', coverage.cover);
    core.setOutput('color', color);
    core.endGroup();
  }

  if (!finalHtml || options.hideComment) {
    core.info('Nothing to report');
    return;
  }
  const body = WATERMARK + finalHtml;
  const octokit = github.getOctokit(token);

  const issue_number = payload.pull_request
    ? payload.pull_request.number
    : issueNumberInput
      ? issueNumberInput
      : 0;

  if (eventName === 'push') {
    if (issueNumberInput) {
      if (createNewComment) {
        core.info('Creating a new comment');
        await octokit.issues.createComment({
          repo,
          owner,
          issue_number,
          body,
        });
      } else {
        await createOrEditComment(
          octokit,
          repo,
          owner,
          issue_number,
          body,
          WATERMARK,
        );
      }
    } else {
      core.info('Create commit comment');
      await octokit.repos.createCommitComment({
        repo,
        owner,
        commit_sha: options.commit,
        body,
      });
    }

  } else if (
    eventName === 'pull_request' ||
    eventName === 'pull_request_target'
  ) {
    if (createNewComment) {
      core.info('Creating a new comment');

      await octokit.issues.createComment({
        repo,
        owner,
        issue_number,
        body,
      });
    } else {
      await createOrEditComment(
        octokit,
        repo,
        owner,
        issue_number,
        body,
        WATERMARK,
      );
    }
  } else if (
    eventName === 'workflow_dispatch' ||
    eventName === 'workflow_run'
  ) {
    await core.summary.addRaw(body, true).write();
    if (!issueNumberInput) {
      // prettier-ignore
      core.warning(`To use this action on a \`${eventName}\`, you need to pass an pull request number.`)
    } else {
      if (createNewComment) {
        core.info('Creating a new comment');
        await octokit.issues.createComment({
          repo,
          owner,
          issue_number,
          body,
        });
      } else {
        await createOrEditComment(
          octokit,
          repo,
          owner,
          issue_number,
          body,
          WATERMARK,
        );
      }
    }
  } else {
    if (!options.hideComment) {
      // prettier-ignore
      core.warning(`This action supports comments only on \`pull_request\`, \`pull_request_target\`, \`push\`, \`workflow_run\` and \`workflow_dispatch\`  events. \`${eventName}\` events are not supported.\nYou can use the output of the action.`)
    }
  }
};

// generate object of all files that changed based on commit through Github API
const getChangedFiles = async (options, pr_number) => {
  try {
    const { context } = github;
    const { eventName, payload } = context;
    const { repo, owner } = context.repo;
    const octokit = github.getOctokit(options.token);

    // Define the base and head commits to be extracted from the payload
    let base, head;

    switch (eventName) {
      case 'pull_request':
      case 'pull_request_target':
        base = payload.pull_request.base.sha;
        head = payload.pull_request.head.sha;
        break;
      case 'push':
        base = payload.before;
        head = payload.after;
        break;
      case 'workflow_run':
      case 'workflow_dispatch': {
        const { data } = await octokit.pulls.get({
          owner,
          repo,
          pull_number: pr_number,
        });

        base = data.base.label;
        head = data.head.label;
        break;
      }
      default:
        // prettier-ignore
        core.warning(`\`report-only-changed-files: true\` supports only on \`pull_request\`, \`workflow_run\`, \`workflow_dispatch\` and \`push\`. Other \`${eventName}\` events are not supported.`)
        return null;
    }

    core.startGroup('Changed files');
    // Log the base and head commits
    core.info(`Base commit: ${base}`);
    core.info(`Head commit: ${head}`);

    let response = null;
    // that is first commit, we cannot get diff
    if (base === '0000000000000000000000000000000000000000') {
      response = await octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: head,
      });
    } else {
      // https://developer.github.com/v3/repos/commits/#compare-two-commits
      response = await octokit.rest.repos.compareCommits({
        base,
        head,
        owner,
        repo,
      });
    }

    // Ensure that the request was successful.
    if (response.status !== 200) {
      core.setFailed(
        `The GitHub API for comparing the base and head commits for this ${eventName} event returned ${response.status}, expected 200. ` +
        "Please submit an issue on this action's GitHub repo.",
      );
    }

    // Get the changed files from the response payload.
    const files = response.data.files;
    const all = [],
      added = [],
      modified = [],
      removed = [],
      renamed = [],
      addedModified = [];

    for (const file of files) {
      const { filename: filenameOriginal, status } = file;
      const filename = filenameOriginal.replace(options.pathPrefix, '');

      all.push(filename);

      switch (status) {
        case FILE_STATUSES.ADDED:
          added.push(filename);
          addedModified.push(filename);
          break;
        case FILE_STATUSES.MODIFIED:
          modified.push(filename);
          addedModified.push(filename);
          break;
        case FILE_STATUSES.REMOVED:
          removed.push(filename);
          break;
        case FILE_STATUSES.RENAMED:
          renamed.push(filename);
          break;
        default:
          // prettier-ignore
          core.setFailed(`One of your files includes an unsupported file status '${status}', expected ${Object.values(FILE_STATUSES).join(',')}.`);
      }
    }

    core.info(`All: ${all.join(',')}`);
    core.info(`Added: ${added.join(', ')}`);
    core.info(`Modified: ${modified.join(', ')}`);
    core.info(`Removed: ${removed.join(', ')}`);
    core.info(`Renamed: ${renamed.join(', ')}`);
    core.info(`Added or modified: ${addedModified.join(', ')}`);

    core.endGroup();

    return {
      all: all,
      [FILE_STATUSES.ADDED]: added,
      [FILE_STATUSES.MODIFIED]: modified,
      [FILE_STATUSES.REMOVED]: removed,
      [FILE_STATUSES.RENAMED]: renamed,
      AddedOrModified: addedModified,
    };
  } catch (error) {
    core.setFailed(error.message);
  }
};

main().catch((err) => {
  core.error(err);
  core.setFailed(err.message);
});

module.exports = __webpack_exports__;
/******/ })()
;