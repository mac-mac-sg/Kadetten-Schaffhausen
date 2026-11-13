import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseHTML} from 'linkedom';

for (const club of ['kadetten','otmar','fcsg']) {
  test(`${club}: Matchday has one portrait followed by a continuous profile and statistics`, () => {
    const football = club === 'fcsg';
    const markup = football
      ? '<section class="fcsg-player"><section id="fcsg-profile-intro"><a class="back-link">Kader</a><img class="fcsg-player-photo"><h1>Spieler</h1><div id="fcsg-player-facts">Steckbrief</div></section><section id="fcsg-profile-stats">Statistik</section><nav class="fcsg-profile-jumps"></nav></section>'
      : '<section class="player-story"><a class="back-link">Kader</a><section class="profile-intro"><div class="portrait"><img><h1>Spieler</h1></div><div class="profile-facts">Steckbrief</div></section><section class="player-season-screen"><div class="profile-minihero"><img></div><div id="player-stats">Statistik</div></section><nav class="profile-jumps"></nav></section>';
    const {document} = parseHTML(`<html><body>${markup}</body></html>`);
    const context = vm.createContext({document});
    vm.runInContext(fs.readFileSync('archive/matchday/client/js/router.js','utf8'),context);
    // The separate Kadetten app retains its original layout and section navigation.
    document.documentElement.dataset.design = 'v2';
    context.setupContinuousPlayerProfile();
    assert.equal(document.querySelector('.player-scroll-content'),null);
    document.documentElement.removeAttribute('data-design');
    context.setupContinuousPlayerProfile();
    context.setupContinuousPlayerProfile();
    const story = document.querySelector('.player-scroll');
    assert.equal(story.querySelectorAll('.player-scroll-content').length,1);
    assert.equal(story.querySelectorAll('img').length,1);
    assert.equal(story.querySelectorAll('h1').length,1);
    assert.equal(story.querySelectorAll('nav').length,0);
    assert.equal(story.querySelector('.back-link').parentElement,story);
    const photo = story.querySelector('.portrait,.fcsg-player-photo');
    assert.equal(photo.parentElement,story);
    assert.equal(photo.nextElementSibling.className,'player-scroll-content');
    assert.match(photo.nextElementSibling.textContent,/Steckbrief.*Statistik/);
  });
}
