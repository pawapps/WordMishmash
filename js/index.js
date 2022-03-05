$( document ).ready(function() {

    const appHeight = () => {
        const doc = document.documentElement;
        doc.style.setProperty('--app-height', `${window.innerHeight}px`);
    }
    window.addEventListener('resize', appHeight);
    appHeight();

    const LOCALSTORAGE_STATE_KEY = 'wordmishmash-state';
    const LETTER_OPTIONS_MIN = 3;
    const LETTER_OPTIONS_MAX = 7;
    const LETTER_OPTIONS_STEP = 2;
    const WORD_LENGTH_MIN = 3;
    const WORD_LENGTH_MAX = 5;
    const WORD_LENGTH_STEP = 1;
    const DEFAULT_STATE = {
        v: VERSION,
        num_letter_options: 3,
        num_word_letters: 4,
        stats: {
            game_count: {
                total: {
                    started: 0,
                    solved: 0
                },
                length: {}
            },
            best: {
                streak: {
                    current: 0,
                    best: 0
                },
                length: {}
            }
        },
        game_status: 'pregame'  // ingame
    }
    let state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    let game_timer = {
        timer: undefined,
        start: undefined
    };
    let dragging_element = undefined;
    let cursor_last = {
        x: undefined,
        y: undefined
    }

    $('#settings-reset-game-data-button').click(() => {
        gtag('event', 'click', 'settings-reset-game-data-button');
        if (confirm('Are you sure you want to delete and reset all game data? All scores will be erased.') == true) {
            // Confirmed
            localStorage.removeItem(LOCALSTORAGE_STATE_KEY);
            reset_game();
            $('#settings-modal').modal('hide');
        }
    });
    $('#settings-button-save').click(() => {
        gtag('event', 'click', 'settings-button-save');
        save_state();
        $('#settings-modal').modal('hide');
    });
    $('#instructions-modal-x').click(() => { gtag('event', 'click', 'instructions-modal-x'); $('#instructions-modal').modal('hide'); });
    $('#menu-info').click((e) => { gtag('event', 'click', 'menu-info'); show_info(); });
    $('#settings-modal-x').click((e) => { gtag('event', 'click', 'settings-modal-x'); $('#settings-modal').modal('hide'); });
    $('#menu-settings').click((e) => { gtag('event', 'click', 'menu-settings'); show_settings(); });
    $('#stats-modal-x').click((e) => { gtag('event', 'click', 'stats-modal-x'); $('#stats-modal').modal('hide'); });
    $('#menu-stats').click((e) => { gtag('event', 'click', 'menu-stats'); show_game_stats(); });
    $('#game-button').click((e) => {
        if (state.game_status == 'pregame') {
            
            gtag('event', 'click', 'select game');
            show_game_stats();
        }

        if (state.game_status == 'ingame') {
            gtag('event', 'click', 'check-word', {word: get_active_word()});
            // Check the word
            if (is_solution(get_active_word())) {
                // Success, game over
                clearInterval(game_timer.timer);
                const delta = Number((((new Date()) - game_timer.start) / 1000).toFixed(3));
                document.getElementById('timer-seconds').innerText = ''+ delta;

                // Save score
                state.stats.game_count.total.solved += 1;
                state.stats.game_count.length[state.num_word_letters][state.num_letter_options].solved += 1;
                const highscore = (state.stats.best.length[state.num_word_letters][state.num_letter_options] === undefined) || (state.stats.best.length[state.num_word_letters][state.num_letter_options] > delta);
                if (highscore) {
                    // New best score
                    console.log('New best score')
                    state.stats.best.length[state.num_word_letters][state.num_letter_options] = delta;
                }

                // Update Streak
                state.stats.best.streak.current += 1;
                if (state.stats.best.streak.current > state.stats.best.streak.best) state.stats.best.streak.best = state.stats.best.streak.current;

                gtag('event', 'solved', {
                    word: get_active_word(),
                    time: delta,
                    state: state
                });
                // Graphic Updates
                console.log('Congrats! '+ delta +' seconds');
                animate_tiles(get_active_tiles(), 'wobble', 1.5, 100);
                document.getElementById('selector').style.backgroundColor = 'var(--bs-success)';

                document.getElementById('game-button').disabled = true;
                document.getElementById('game-button').innerText = 'Click to select a game!';
                state.game_status = 'pregame';
                save_state();

                setTimeout(function() {
                    show_game_stats({highscore: highscore, time: delta});
                    document.getElementById('game-button').disabled = false;
                }, 1500 + 100*state.num_word_letters);

                return;
            } else {
                // Incorrect
                animate_tiles(get_active_tiles(), 'shake', 0.25, 0);
                document.getElementById('selector').style.backgroundColor = 'var(--bs-danger)';
                console.log('Not a valid answer');
                return;
            }
        }
    });

    const start_game = function() {
        // Start the game
        let solution = get_new_word();
        // console.log(solution);
        let mishmashed_word = solution;
        let word_matrix = undefined;

        // Don't start with an answer as the mishmashed word
        while(is_solution(mishmashed_word)) {
            mishmashed_word = mishmash_word(solution);
            word_matrix = create_word_matrix(mishmashed_word);
            mishmashed_word = word_matrix[Math.floor(word_matrix.length / 2)].join('');
        }
        show_new_word(word_matrix);
        document.getElementById('game-button').innerText = 'Check word'

        gtag('event', 'start', {
            word: solution,
            mishmashed: mishmashed_word,
            state: state
        });

        // Set up the game timer
        game_timer.start = new Date();
        game_timer.timer = setInterval(() => {
            const delta = ((new Date()) - game_timer.start) / 1000;
            document.getElementById('timer-seconds').innerText = delta.toFixed(3);
        }, 21);

        // Init stats
        if (state.stats.game_count.length[state.num_word_letters] === undefined) {
            state.stats.game_count.length[state.num_word_letters] = {};
            state.stats.best.length[state.num_word_letters] = {};
        }
        if (state.stats.game_count.length[state.num_word_letters][state.num_letter_options] === undefined) {
            state.stats.game_count.length[state.num_word_letters][state.num_letter_options] = {
                started: 0,
                solved: 0
            };
            state.stats.best.length[state.num_word_letters][state.num_letter_options] = undefined;
        }
        state.stats.game_count.length[state.num_word_letters][state.num_letter_options].started += 1;
        state.stats.game_count.total.started += 1;

        state.game_status = 'ingame';
        save_state();

        return;
    }

    const show_info = function() {
        $('#instructions-modal').modal('show');
    }

    const show_game_stats = function(cur_game=undefined) {
        
        $('#stats-total-started').text(state.stats.game_count.total.started);
        const perc_solved = 100*(state.stats.game_count.total.solved / state.stats.game_count.total.started);
        $('#stats-total-percent-solved').text((isNaN(perc_solved) ? 0 : perc_solved.toFixed(0)));
        $('#stats-streak-current').text(state.stats.best.streak.current);
        $('#stats-streak-best').text(state.stats.best.streak.best);

        if (cur_game != undefined && cur_game.time != undefined) {
            $('#stats-game-message').removeClass('d-none');
            if (cur_game.highscore == true) {
                $('#stats-game-message').html('New High Score!<br>You solved the puzzle in '+ cur_game.time +' seconds!');
                $('#stats-game-message').addClass('alert-success');
                $('#stats-game-message').removeClass('alert-secondary');
            } else {
                $('#stats-game-message').text('You solved the puzzle in '+ cur_game.time +' seconds!');
                $('#stats-game-message').removeClass('alert-success');
                $('#stats-game-message').addClass('alert-secondary');
            }
        } else {
            $('#stats-game-message').addClass('d-none');
        }

        let stats_table = document.getElementById('stats-best-times');
        stats_table.innerHTML = '';

        for (let i=LETTER_OPTIONS_MIN-LETTER_OPTIONS_STEP ; i<=LETTER_OPTIONS_MAX ; i+=LETTER_OPTIONS_STEP) {
            let row = document.createElement('div');
            row.classList.add('d-flex', 'flex-row', 'justify-content-center');

            for (let j=WORD_LENGTH_MIN ; j<=WORD_LENGTH_MAX ; j+=WORD_LENGTH_STEP) {

                if (j == WORD_LENGTH_MIN || i == (LETTER_OPTIONS_MIN-LETTER_OPTIONS_STEP)) {
                    // Labels

                    let header_box = document.createElement('div');
                    header_box.classList.add('d-flex', 'flex-column', 'justify-content-center', 'align-items-center');
                    header_box.style.height = ''+ (1.3*(calc_letter_div_height()+calc_letter_div_margin())) +'px';
                    header_box.style.width = ''+ (1.3*(calc_letter_div_width()+calc_letter_div_margin())) +'px';
                    header_box.style.margin = ''+ calc_letter_div_margin() +'px';
                    
                    let header_data = document.createElement('div');
                    header_data.classList.add('stats-data');
                    header_data.style.fontSize = ''+ (calc_scale()*1.5) +'em';
                    header_data.innerText = (i == (LETTER_OPTIONS_MIN-LETTER_OPTIONS_STEP) ? j : i);
                    header_box.appendChild(header_data);

                    let header_label = document.createElement('div');
                    header_label.classList.add('stats-label');
                    header_label.style.fontSize = ''+ (calc_scale()*0.7) +'em';
                    header_label.innerHTML = (i == (LETTER_OPTIONS_MIN-LETTER_OPTIONS_STEP) ? 'word<br>length' : 'letter<br>options');
                    header_box.appendChild(header_label);

                    if (j == WORD_LENGTH_MIN && i == (LETTER_OPTIONS_MIN-LETTER_OPTIONS_STEP)) {
                        // Top column and row, needs blank
                        let blank_box = header_box.cloneNode(false);
                        row.appendChild(blank_box);
                    }

                    row.appendChild(header_box);

                    if (i == (LETTER_OPTIONS_MIN-LETTER_OPTIONS_STEP)) continue;
                }

                let best_time = undefined;
                try {
                    best_time = state.stats.best.length[j][i];
                } catch(e) {}

                let stat_box = document.createElement('div');
                stat_box.classList.add('letter-picker-letter', 'd-flex', 'flex-column', 'justify-content-center', 'align-items-center');
                stat_box.setAttribute('role', 'button');
                stat_box.style.height = ''+ (1.3*(calc_letter_div_height()+calc_letter_div_margin())) +'px';
                stat_box.style.width = ''+ (1.3*(calc_letter_div_width()+calc_letter_div_margin())) +'px';
                stat_box.style.margin = ''+ calc_letter_div_margin() +'px';
                stat_box.style.boxShadow = 'none';

                if (j == state.num_word_letters && i == state.num_letter_options) {
                    // Box for current game config
                    stat_box.style.border = '4px double';
                    if (cur_game != undefined && cur_game.highscore == true) {
                        // New High Score
                        stat_box.style.borderColor = 'var(--bs-success)';
                        animate_tiles([stat_box], 'pulse', 1.5, 0, true);
                    }
                }

                $(stat_box).click((e) => {
                    if (state.game_status == 'ingame') {
                        if (confirm('A game is in progress, do you really want to start a new game?') != true) {
                            return;
                        }
                    }
                    state.num_letter_options = i;
                    state.num_word_letters = j;
                    save_state();
                    reset_game();
                    $('#stats-modal').modal('hide');
                    start_game();
                });
                $(stat_box).mouseenter((e) => {
                    stat_box.style.backgroundColor = 'var(--bs-light)';
                });
                $(stat_box).mouseleave((e) => {
                    stat_box.style.backgroundColor = 'var(--bs-white)';
                });

                let stat_data = document.createElement('div');
                stat_data.classList.add('stats-data');
                stat_data.style.fontSize = ''+ (calc_scale()*1.3) +'em';
                
                stat_data.innerText = ''+ (best_time == undefined ? '-' : best_time);

                stat_box.appendChild(stat_data);

                let stat_label = document.createElement('div');
                stat_label.classList.add('stats-label');
                stat_label.style.fontSize = ''+ (calc_scale()*0.7) +'em';
                stat_label.innerText = 'seconds';
                stat_box.appendChild(stat_label);

                let solved_label = document.createElement('div');
                solved_label.classList.add('stats-label', 'mt-1', 'pt-1', 'border-top');
                solved_label.style.color = 'var(--bs-dark)';

                let solved_count = 0;
                try {
                    solved_count = state.stats.game_count.length[j][i].solved;
                } catch(e) {}
                solved_label.innerText = 'Solved: '+ solved_count;
                stat_box.appendChild(solved_label);

                row.appendChild(stat_box);
            }

            stats_table.appendChild(row);
            stats_table.style.marginLeft = '-'+ (.6*(calc_letter_div_width()+calc_letter_div_margin())) +'px';
            
        }

        $('#stats-modal').modal('show');
    }

    const show_settings = function() {

        $('#settings-version').text(VERSION);
        $('#settings-modal').modal('show');
    }

    const animate_tiles = function(tiles, name, duration, delay, infinite=false) {
        for (let i=0 ; i<tiles.length ; i++) {
            setTimeout(() => {
                // Reset animation
                tiles[i].style.animation = 'none';
                tiles[i].offsetHeight;
                tiles[i].style.animation = null;
                // Do animation
                tiles[i].style.animation = name +' '+ duration +'s'+ (infinite == true ? ' infinite' : '');
            }, delay*i);
        }
    }

    const save_state = function() {
        localStorage.setItem(LOCALSTORAGE_STATE_KEY, JSON.stringify(state));
    }

    const reset_game = function() {
        state.game_status = 'pregame';
        if (game_timer.timer != undefined) {
            clearInterval(game_timer.timer);
        }
        $('#timer-seconds').text('0.000');
        $('#game-button').text('Click to select game!');
        init(true);
    }

    const init = function(soft_reset=false) {
        let local_state = localStorage.getItem(LOCALSTORAGE_STATE_KEY);
        if (local_state != null) {
            // Not first time
            state = JSON.parse(local_state);

            // Check if previous game was completed
            if (state.game_status == 'ingame') {
                state.game_status = 'pregame';
                state.stats.best.streak.current = 0;
                save_state();
            }

        } else {
            // First time
            state = JSON.parse(JSON.stringify(DEFAULT_STATE));
            save_state();
            if (soft_reset == false) show_info();
        }
        show_new_word( [['','','','','',''],
                        ['','W','O','R','D',''],
                        ['','M','I','S','H',''],
                        ['','M','A','S','H',''],
                        ['','','','','','']]);
    }

    const calc_letter_div_height = function() {
        return calc_scale()*65;
    }

    const calc_letter_div_width = function() {
        return calc_scale()*65;
    }

    const calc_letter_div_margin = function() {
        return 5;
    }

    const calc_scale = function() {
        const HEIGHT_REF = 900;
        const WIDTH_REF = 500;
        if (window.innerHeight > HEIGHT_REF && window.innerWidth > WIDTH_REF) return 1;
        let height_scale = window.innerHeight / HEIGHT_REF;
        let width_scale = window.innerWidth / WIDTH_REF;

        // Return the small of the two scales
        if (height_scale < width_scale) return height_scale;
        return width_scale;
    }

    const start_drag = function(e) {

        e.preventDefault();

        const selector = document.getElementById('selector');
        selector.style.backgroundColor = 'var(--bs-secondary)';

        cursor_last.x = e.clientX || e.touches[0].clientX;
        cursor_last.y = e.clientY || e.touches[0].clientY;
        dragging_element = e.currentTarget;
    }

    const do_drag = function(e) {

        if (dragging_element == undefined) return;

        let new_top = dragging_element.offsetTop + ((e.clientY || e.touches[0].clientY) - cursor_last.y);
        const letter_div_height_with_margin = calc_letter_div_height() + calc_letter_div_margin();
        const max_top = ($('#selector')[0].offsetTop + letter_div_height_with_margin*Math.floor(state.num_letter_options/2)) + (letter_div_height_with_margin/2 - 1);
        const min_top = ($('#selector')[0].offsetTop - letter_div_height_with_margin*Math.floor(state.num_letter_options/2)) - (letter_div_height_with_margin/2 - 1);
        
        if (new_top < min_top) new_top = min_top;
        if (new_top > max_top) new_top = max_top;

        dragging_element.style.top = ''+ new_top + 'px';
        cursor_last.x = e.clientX || e.touches[0].clientX;
        cursor_last.y = e.clientY || e.touches[0].clientY;
    }

    const stop_drag = function(e) {

        if (dragging_element == undefined) return;
        e.preventDefault();

        const selector_top = $('#selector')[0].offsetTop;
        const cur_offset = selector_top - dragging_element.offsetTop;
        const letter_div_height_with_margin = calc_letter_div_height() + calc_letter_div_margin();
        const new_offset = Math.round(cur_offset/letter_div_height_with_margin)*letter_div_height_with_margin;
        $(dragging_element).animate({top: ''+ (dragging_element.offsetTop - (new_offset - cur_offset)) + 'px'});

        dragging_element = undefined;
    }

    $('body').mousemove(do_drag);
    $('body').on('touchmove', do_drag);
    $('body').mouseup(stop_drag);
    $('body').mouseleave(stop_drag);
    $('body').on('touchend', stop_drag);

    const mishmash_word = function(word) {
        word = word.toUpperCase();
        let mishmashed_word = '';

        for (let i=0 ; i<word.length ; i++) {
            const letter = word[i];
            let letter_offset = Math.floor(Math.random() * state.num_letter_options);
            if (letter.charCodeAt() - letter_offset - 'A'.charCodeAt() < 0) {
                letter_offset += (letter.charCodeAt() - letter_offset - 'A'.charCodeAt());
            } else if (letter.charCodeAt() + ((state.num_letter_options-1) - letter_offset) - 'Z'.charCodeAt() > 0) {
                letter_offset += (letter.charCodeAt() + ((state.num_letter_options-1) - letter_offset) - 'Z'.charCodeAt());
            }

            let first_letter_option = String.fromCharCode(letter.charCodeAt() - letter_offset);
            mishmashed_word += first_letter_option;
        }

        return mishmashed_word;
    }

    const get_new_word = function() {
        return word_list[state.num_word_letters][Math.floor(Math.random()*word_list[state.num_word_letters].length)].toUpperCase();
    }

    const get_active_tiles = function() {
        let active_tiles = [];

        $('.letter-picker').each(function(index) {
            const selector_top = $('#selector')[0].offsetTop;
            const cur_offset = selector_top - this.offsetTop;
            const letter_div_height_with_margin = calc_letter_div_height() + calc_letter_div_margin();
            const new_offset = Math.round(cur_offset/letter_div_height_with_margin)*letter_div_height_with_margin;
            const option_index = Math.floor((new_offset + (letter_div_height_with_margin*Math.floor(state.num_letter_options/2))) / letter_div_height_with_margin);
            active_tiles.push(this.getElementsByClassName('letter-picker-letter')[option_index]);
        });

        return active_tiles;
    }
    

    const get_active_word = function() {
        let active_word = '';

        const active_tiles = get_active_tiles();
        for (let i=0 ; i<active_tiles.length ; i++) {
            active_word += active_tiles[i].innerText;
        }
        
        return active_word;
    }

    const is_solution = function(word) {
        return is_word(word);
    }

    const create_word_matrix = function(word) {
        let matrix = [];

        for (let i=0 ; i<word.length ; i++) {

            let cur_letter = word[i];
            for (let j=0 ; j<state.num_letter_options ; j++) {
                // Create individual letter
                if (matrix[j] == undefined) matrix[j] = [];
                matrix[j].push(cur_letter);
                cur_letter = String.fromCharCode(cur_letter.charCodeAt() + 1);
            }
        }
        return matrix;
    }

    const show_new_word = function(word_matrix) {

        let selector = document.createElement('div');
        selector.id = 'selector';
        selector.style.height = ''+ (calc_letter_div_height()+calc_letter_div_margin()) +'px';
        document.getElementById('word-div').innerHTML = '';
        document.getElementById('word-div').appendChild(selector);

        for (let i=0 ; i<word_matrix[0].length ; i++) {
            // Create letter picker wheel
            let letter_picker = document.createElement('div');
            letter_picker.classList.add('letter-picker');
            const letter_div_width_with_margin = calc_letter_div_width() + 2*calc_letter_div_margin();
            letter_picker.style.marginLeft = ''+ ((letter_div_width_with_margin * i) - (letter_div_width_with_margin * (word_matrix[0].length/2)) + (letter_div_width_with_margin/2)) +'px';
            letter_picker.style.width = ''+ calc_letter_div_width() +'px';
            letter_picker.dataset.letters = '';

            
            for (let j=0 ; j<word_matrix.length ; j++) {
                // Create individual letter
                let cur_letter = word_matrix[j][i];
                let letter_picker_letter = document.createElement('div');
                letter_picker_letter.classList.add('letter-picker-letter', 'd-flex', 'flex-column', 'justify-content-center', 'align-items-center');
                letter_picker_letter.style.height = ''+ calc_letter_div_height() +'px';
                letter_picker_letter.style.margin = ''+ calc_letter_div_margin() +'px';
                letter_picker_letter.style.fontSize = ''+ (calc_scale()*2.5) +'em';
                letter_picker_letter.innerText = cur_letter;
                letter_picker.dataset.letters += cur_letter;
                cur_letter = String.fromCharCode(cur_letter.charCodeAt() + 1);

                letter_picker.appendChild(letter_picker_letter);
            }

            // Add listener for actions on letter picker wheel
            $(letter_picker).mousedown(start_drag);
            $(letter_picker).on('touchstart', start_drag);
            document.getElementById('word-div').appendChild(letter_picker);
            document.getElementById('word-div').style.height = ''+ calc_scale()*360 +'px';
        }

    }

    init();
});