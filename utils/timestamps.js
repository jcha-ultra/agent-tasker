require('colors');

function timeHasPassed(timeCountThresholdRaw) {
    timeCountThresholdRaw = Number.parseInt(timeCountThresholdRaw);
    if (timeCountThresholdRaw) {
        const timeCountThresholdMinute = timeCountThresholdRaw % 100;
        const timeCountThresholdHour = Math.floor(timeCountThresholdRaw / 100);
        const now = new Date(Date.now());
        const minuteRaw = now.getMinutes() + '';
        const minute = minuteRaw.length < 2 ? '0' + minuteRaw : minuteRaw;
        const hour = now.getHours();
        const timeCountDiff = (timeCountThresholdHour - hour) * 60 + (timeCountThresholdMinute - minute);
        // console.log(timeCountThreshold)
        // console.log(timeCount)
        return timeCountDiff <= 10;
    } else {
        return false;
    }
}
// console.log(timeHasPassed('1900'))

function colorCodeTimeString(timeCountThreshold) {
    const now = new Date(Date.now());
    const minute = now.getMinutes();
    const hour = now.getHours();
    const timeCount = Number.parseInt('' + hour + minute);
    const timeCountDiff = timeCountThreshold - timeCount;

    let color;
    if (timeCountDiff < 0) {
        color = 'red';
    } else if (timeCountDiff <= 10) {
        color = 'yellow';
    } else {
        color = 'green';
    }
    return ('' + timeCountThreshold)[color];
}

module.exports = { colorCodeTimeString, timeHasPassed };
