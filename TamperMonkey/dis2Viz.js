// ==UserScript==
// @name         Dis2Viz
// @namespace    http://tampermonkey.net/
// @version      2024-01-09
// @description  Convert OpenSearch Discovery bundle to OpenSearch Visualization table
// @author       dagfinnur
// @match        http://localhost:5601/app/discover*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none
// ==/UserScript==

window.addEventListener('load', function () {
    'use strict';

    const button = document.createElement("button");
    button.innerHTML = "Dis2Viz";
    button.id = "myCustomButton";
    Object.assign(button.style, {
        position: "fixed",
        top: "10px",
        left: "100px",
        zIndex: "10000",
        padding: "10px 20px",
        border: "1px solid #000",
        backgroundColor: "#228B22",
        color: "#fff",
        fontFamily: "Comic Sans MS, sans-serif",
        fontSize: "8px",
        cursor: "pointer"
    });

    button.onmouseover = () => button.style.backgroundColor = "#1B691B";
    button.onmouseout = () => button.style.backgroundColor = "#228B22";

    document.body.appendChild(button);

    button.addEventListener("click", async () => {
        const indexTitleName = document.querySelector("#discover-sidebar > div > section > div.dscIndexPattern__container > div > div > button > span > span")?.textContent.trim();
        const response = await fetch('http://localhost:5601/api/saved_objects/_find?fields=title&per_page=10000&type=index-pattern');
        const data = await response.json();
        const indexPatternId = data.saved_objects.find(obj => obj.attributes.title === indexTitleName)?.id;
        const tableCells = Array.from(document.querySelectorAll("th")).slice(1);
        const textarea = document.querySelector("textarea");
        const filters = document.querySelectorAll(".euiFlexItem.euiFlexItem--flexGrowZero.globalFilterBar__flexItem");
        const dateRange = document.querySelector(".euiDatePickerRange.euiDatePickerRange--inGroup");
        const dateRangeValue = dateRange.querySelector(".euiSuperDatePicker__prettyFormat")?.childNodes[0].textContent.trim() || `From: ${dateRange.querySelector(".euiDatePopoverButton.euiDatePopoverButton--start").textContent.trim()}, To: ${dateRange.querySelector(".euiPopover.euiPopover--anchorDownRight.euiPopover--displayBlock").textContent.trim()}`;
        const newWindow = window.open("", "_blank");
        const visualizeUrl = generateVisualizeUrl(indexPatternId, textarea.value, dateRangeValue, filters, tableCells);
        newWindow.location.href = visualizeUrl;
    });

    function generateVisualizeUrl(indexPatternId, query, dateRange, filters, tableCells) {
        var timeFrom, timeTo;
        if (dateRange.startsWith("Last ")) {
            var matches = dateRange.match(/Last (\d+) (\w+)/);
            if (matches) {
                var number = matches[1];
                var unit = matches[2].charAt(0);
                timeFrom = `now-${number}${unit}`;
                timeTo = "now";
            }
        } else if (dateRange === "Today") {
            timeFrom = timeTo = "now%2Fd";
        } else if (dateRange === "This week") {
            timeFrom = timeTo = "now%2Fw";
        } else {
            var dateMatches = dateRange.match(/(\w+ \d+, \d+ @ \d+:\d+:\d+\.\d+|now|Last \d+ \w+|Today|This week)/g);
            if (!dateMatches || dateMatches.length < 2) {
                console.error('Invalid date range:', dateRange);
                return;
            }
            timeFrom = convertDateRangeValue(dateMatches[0]);
            timeTo = convertDateRangeValue(dateMatches[1]);
        }
        var vURL = `http://localhost:5601/app/visualize#/create?type=table&indexPattern=${indexPatternId}&_g=(filters:!(),refreshInterval:(pause:!t,value:0),time:(from:${timeFrom},to:${timeTo}))&_a=(filters:!(`;

        filters.forEach(function (filter) {
            var filterText = filter.textContent.replace(/(^\s+|\s(?=\s))/g, '');
            var isNegationFilter = filterText.startsWith("NOT ");
            if (isNegationFilter) {
                filterText = filterText.substring(4);
            }

            var keyFilterText = filterText.split(":")[0];
            var valueFilterText = filterText.split(":")[1].replace(/(^\s+|\s(?=\s))/g, '').replace(/ /g, '%20');

            vURL += `('$state':(store:appState),meta:(alias:!n,disabled:!f,index:'${indexPatternId}',key:'${keyFilterText}',negate:${isNegationFilter ? '!t' : '!f'},params:(query:'${valueFilterText}'),type:phrase),query:(match_phrase:(${keyFilterText}:'${valueFilterText}'))),`;
        });
        if (filters.length > 0) {
            vURL = vURL.slice(0, -1);
        }
        query = query.replace(/ /g, '%20');

        vURL += `),linked:!f,query:(language:lucene,query:'${query}'),uiState:(),vis:(aggs:!((enabled:!t,id:'1',params:(),schema:metric,type:count)`;

        let cellIndex = 0;

        tableCells.forEach(function (cell, i) {
            var cellText = cell.innerText;

            if (cellText !== "Time") {
                cellText = cellText.trim()
                vURL += `,(enabled:!t,id:'${i + 2}',params:(field:${cellText},missingBucket:!t,missingBucketLabel:'-',order:desc,orderBy:'1',otherBucket:!f,otherBucketLabel:Other,size:500),schema:bucket,type:terms)`;
            }
            cellIndex++;
        });

        vURL += "),params:(perPage:10,percentageCol:'',showMetricsAtAllLevels:!f,showPartialRows:!f,showTotal:!f,totalFunc:sum),title:'',type:table))";

        return vURL;
    }

    function convertDateRangeValue(value) {
        if (value.startsWith("Last ")) {
            var matches = value.match(/Last (\d+) (\w+)/);
            if (matches) {
                var number = matches[1];
                var unit = matches[2].charAt(0);
                return `now-${number}${unit}`;
            }
        } else if (value === "Today") {
            return "now%2Fd";
        } else if (value === "This week") {
            return "now%2Fw";
        } else if (value === "now") {
            return "now";
        } else {
            return `'${new Date(value).toISOString()}'`;
        }
    }

    setInterval(function () {
        if (!document.getElementById("myCustomButton")) {
            document.body.appendChild(button);
        }
    }, 1000);
});