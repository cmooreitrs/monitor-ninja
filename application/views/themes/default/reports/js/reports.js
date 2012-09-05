// to keep last valid value. Enables restore of value when an invalid value is set.
var start_time_bkup = '';
var end_time_bkup = '';
var _schedule_remove = false;

$(document).ready(function() {

	$("#saved_report_form").bind('submit', function() {
		return check_and_submit($(this));
	});

	// reset options and reload page
	$('#new_report').click(function() {
		var current_report = $('input[name=type]').val();
		var base_uri = _site_domain + _index_page + '/' + _current_uri;
		var uri_xtra = current_report == 'avail' ? '' : '?type=sla';
		self.location.href = base_uri + uri_xtra;
	});

	disable_sla_fields($('#report_period').attr('value'));

	$("#report_form").bind('submit', function() {
		loopElements();
		return validate_report_form();
	});

	$("#report_period").bind('change', function() {
		show_calendar($(this).attr('value'));
	});
	show_calendar($("#report_period").attr('value'));

	$('.autofill').click(function() {
		var the_val = $("input[name='" + $(this).attr('id') + "']").attr('value');
		if (the_val!='') {
			if (!confirm(_reports_propagate.replace('this value', the_val+'%'))) {
				return false;
			}
			set_report_form_values(the_val);
		} else {
			if (!confirm(_reports_propagate_remove)) {
				return false;
			}
			set_report_form_values('');
		}
	});

	$("#new_schedule_btn").click(function() {$('.schedule_error').hide();})
	setup_editable();

	$('.fancybox').click(function() {
		setup_editable('fancy');
		// set initial states
	});

	$('#filename').blur(function() {
		// Make sure the filename is explicit by adding it when focus leaves input
		var input = $(this);
		var filename = input.val();
		if(!filename) {
			return;
		}
		if(!filename.match(/\.(csv|pdf)$/)) {
			filename += '.pdf';
		}
		input.val(filename);
	});

});

function validate_report_form(f)
{
	var is_ok = check_form_values();
	if (!is_ok) {
		return false;
	}
	var errors = 0;
	var err_str = '';
	var jgrowl_err_str = '';

	var fancy_str = '';
	if ($('#fancybox-content').is(':visible')) {
		fancy_str = '#fancybox-content ';
	}

	// only run this part if report should be saved
	if ($(fancy_str + "#save_report_settings").attr('checked') == true || $('input[name=save_report_settings]').is(':checked')) {
		var report_name = $.trim($('input[name=report_name]').attr('value'));
		if (report_name == '') {
			// fancybox is stupid and copies the form so we have to force
			// this script to check the form in the fancybox_content div
			report_name = $.trim($(fancy_str + '#report_name').attr('value'));
		}

		// these 2 fields should be the same no matter where on the
		// page they are found
		var saved_report_id = $('input[name=saved_report_id]').attr('value');
		var old_report_name = $.trim($('input[name=old_report_name]').attr('value'));

		if (report_name == '') {
			errors++;
			jgrowl_err_str += _reports_name_empty + "\n";
			err_str += "<li>" + _reports_name_empty + ".</li>";
		}

		// display err_str if any

		if (errors) {
			// clear all style info from progress
			$('#response').attr("style", "");
			$('#response').html("<ul class=\"error\">" + err_str + "</ul>");
			window.scrollTo(0,0); // make sure user sees the error message

			jgrowl_message(jgrowl_err_str, _error_header);
			return false;
		}
	}
	$('#response').html('').hide();
	return true;
}

function trigger_ajax_save(f)
{
	// first we need to make sure we get the correct field information
	// for report_name since fancybox is pretty stupid
	$('input[name=report_name]').attr('value', $('#fancybox-content #report_name').attr('value'));

	// ajax post form options for SLA save generated report
	var sla_options = {
		target:			'#response',		// target element(s) to be updated with server response
		beforeSubmit:	validate_report_form,	// pre-submit callback
		success:		show_sla_saveresponse,	// post-submit callback
		dataType: 'json'
	};
	$('#fancybox-content #report_form_sla').ajaxSubmit(sla_options);
	return false;
}

function show_sla_saveresponse(responseText, statusText)
{
	if (responseText.status == 'ok' && statusText == 'success') {
		jgrowl_message(responseText.status_msg, _success_header);

		// propagate new values to form
		$('input[name=saved_report_id]').attr('value', responseText.report_id);
		$('input[name=report_id]').attr('value', responseText.report_id);
		$('input[name=report_name]').attr('value', $('#fancybox-content #report_name').attr('value'));
		$('#scheduled_report_name').text($('#fancybox-content #report_name').attr('value'));
	}
	$('#view_add_schedule').show();
	$('#save_to_schedule').hide();
	$.fancybox.close();
}

function ajax_submit(f)
{
	show_progress('progress', _wait_str);
	// fetch values from form
	var report_id = 0;

	var rep_type = $('#rep_type').fieldValue();
	rep_type = rep_type[0];
	var rep_type_str = $('#rep_type option:selected').val();

	var saved_report_id = $('#saved_report_id').fieldValue()[0];

	var period = $('#period').fieldValue()[0];
	var period_str = $('#period option:selected').text();

	var recipients = $.trim($('#recipients').fieldValue()[0]);

	if (!check_email(recipients)) {
		alert(_reports_invalid_email);
		return false;
	}

	var filename = $('#filename').fieldValue()[0];

	var description = $('#description').fieldValue()[0];

	var report_types = $.parseJSON(_report_types_json);
	for (var i in report_types) {
		if (report_types[i] == rep_type) {
			report_type_id = i;
		}
	}

	if(!validate_form()) {
		setTimeout(delayed_hide_progress, 1000);
		return false;
	}
	var local_persistent_filepath = $.trim($('#local_persistent_filepath').val());
	$.ajax({
		url:_site_domain + _index_page + '/reports/schedule',
		type: 'POST',
		data: {report_id: report_id, rep_type: rep_type, saved_report_id: saved_report_id, period: period, recipients: recipients, filename: filename, description: description, local_persistent_filepath: local_persistent_filepath},
		success: function(data) {
			if (data.error) {
				jgrowl_message(data.error, _reports_error);
			} else {
				new_schedule_rows(data.result.id, period_str, recipients, filename, description, rep_type_str, report_type_id, local_persistent_filepath);
				jgrowl_message(_reports_schedule_create_ok, _reports_success);
			}
		},
		dataType: 'json'
	});
	setTimeout(delayed_hide_progress, 1000);
	return false;
}

/**
*	Switch report type without page reload
*/
function switch_report_type()
{
	// new values in report_period (AJAX call)
	// update saved + scheduled reports
	var current_report = $('input[name=type]').val();
	var other_report = current_report == 'avail' ? 'sla' : 'avail';
	if (current_report == 'avail') { // switching to SLA
		other_report = 'sla';
		$('#switch_report_type_txt').text(_label_switch_to + ' ' + _label_avail + ' ' + _label_report);
		$('#enter_sla').show();
		$('#switcher_image').attr('src', _site_domain + _theme_path + 'icons/16x16/availability.png');
		$('#switcher_image').attr('alt', _label_avail);
		$('#switcher_image').attr('title', _label_avail);
		$(".sla_display").show();
		$(".avail_display").hide();

		$('#csv_cell').hide();
		$("#report_type_label").text(_label_sla + ' ' + _label_report);
	} else {
		other_report = 'avail';
		$('#switch_report_type_txt').text(_label_switch_to + ' ' + _label_sla + ' ' + _label_report);
		$('#enter_sla').hide();
		$('#switcher_image').attr('src', _site_domain + _theme_path + 'icons/16x16/sla.png');
		$('#switcher_image').attr('alt', _label_sla);
		$('#switcher_image').attr('title', _label_sla);
		$(".sla_display").hide();
		$(".avail_display").show();

		$('#csv_cell').show();
		$("#report_type_label").text(_label_avail + ' ' + _label_report);
	}
	$('input[name=type]').val(other_report);
	$("#single_schedules").remove();
	$("#display").hide();
	get_report_periods(other_report);
	get_saved_reports(other_report);

	// reset saved_report_id
	$('input[name=saved_report_id]').val(0);
	$('input[name=report_name]').val('');
}

function get_saved_reports(type, schedules)
{
	show_progress('progress', _wait_str);
	var ajax_url = _site_domain + _index_page + '/ajax/';
	var url = ajax_url + "get_saved_reports/";
	var data = {type: type};
	var field = false;

	field = schedules == true ? 'saved_report_id' : 'report_id';
	empty_list(field);

	$.ajax({
		url: url,
		type: 'POST',
		data: data,
		success: function(data) {
			if (data != '') {
				// OK, populate
				populate_saved_reports(data, field);
				$('#saved_reports_display').show();
				$('.sla_values').show();
			} else {
				// error
				// suppressed since this is not always an error - they maybe doesn't exist yet
				//jgrowl_message('Unable to fetch saved reports...', _reports_error);
				$('#saved_reports_display').hide();
				$('.sla_values').hide();
			}
		}
	});

}

function create_filename()
{
	if (!$('#saved_report_id option:selected').val()) {
		$('input[name=filename]').val('');
		return false;
	}
	var new_filename = $('#saved_report_id option:selected').text();
	new_filename = remove_scheduled_str(new_filename);
	new_filename += '_' + $('#period option:selected').text() + '.pdf';
	new_filename = new_filename.replace(/ /g, '_');
	if ($('input[name=filename]').val() != '' && $('input[name=filename]').val() != current_filename) {
		if (!confirm(_schedule_change_filename)) {
			return false;
		}
	}
	$('input[name=filename]').val(new_filename);
	current_filename = new_filename;
	return true;
}

function remove_scheduled_str(in_str)
{
	in_str = in_str.replace(/\*/g, '');
	in_str = in_str.replace(" ( " + _scheduled_label + " )", '');
	return in_str;
}

function populate_saved_sla_data(json_data) {
	json_data = eval(json_data);
	for (var i = 1; i <= 12; i++) {
		$("#sla_month_"+i).attr('value','');
	}
	for (var i = 0; i < json_data.length; i++) {
		var j = i+1;
		var name = json_data[i].name;
		var value = json_data[i].value;
		if (document.getElementById("sla_"+name).style.backgroundColor != 'rgb(205, 205, 205)')
			$("#sla_"+name).attr('value',value);
	}
	setTimeout(delayed_hide_progress, 1000);
}

// Propagate sla values
function set_report_form_values(the_val)
{
	for (i=1;i<=12;i++) {
		var field_name = 'month_' + i;
		if ($("input[name='" + field_name + "']").attr('disabled')) {
			$("input[name='" + field_name + "']").attr('value', '');
		} else {
			$("input[name='" + field_name + "']").attr('value', the_val);
		}
	}
}

/**
*	Receive params as JSON object
*	Parse fields and populate corresponding fields in form
*	with values.
*/
function expand_and_populate(data)
{
	var reportObj = data;
	var field_obj = new field_maps();
	var tmp_fields = new field_maps3();
	var field_str = reportObj.report_type;
	set_selection(reportObj.report_type, function() {
		var mo = new missing_objects();
		if (reportObj.objects) {
			for (var prop in reportObj.objects) {
				if (!$('#'+tmp_fields.map[field_str]).containsOption(reportObj.objects[prop])) {
					mo.add(reportObj.objects[prop]);
				} else {
					$('#'+tmp_fields.map[field_str]).selectOptions(reportObj.objects[prop]);
				}
			}
			mo.display_if_any();
			moveAndSort(tmp_fields.map[field_str], field_obj.map[field_str]);
		}
	});
	set_initial_state('scheduleddowntimeasuptime', reportObj.scheduleddowntimeasuptime);
	set_initial_state('report_type', reportObj.report_type);
	set_initial_state('report_period', reportObj.report_period);
	show_calendar(reportObj.report_period);
	set_initial_state('rpttimeperiod', reportObj.rpttimeperiod);
	if (reportObj.report_name != undefined) {
		set_initial_state('report_name', reportObj.report_name);
	}
	set_initial_state('includesoftstates', reportObj.includesoftstates);
	if (reportObj.report_period == 'custom') {
		if ($('input[name=type]').attr('value') == 'sla') {
			js_print_date_ranges(reportObj.start_time, 'start', 'month');
			js_print_date_ranges(reportObj.end_time, 'end', 'month');

			setTimeout('set_initial_state("report_period-start", ' + reportObj.start_year + ')', 2000);
			setTimeout('set_initial_state("report_period-startmonth", ' + reportObj.start_month + ')', 2000);
			setTimeout('set_initial_state("report_period-end", ' + reportObj.end_year + ')', 2000);
			setTimeout('set_initial_state("report_period-endmonth", ' + reportObj.end_month + ')', 2000);
		} else {
			startDate = epoch_to_human(reportObj.start_time);
			//$('#cal_start').text(format_date_str(startDate));
			document.forms.report_form.start_time.value = format_date_str(startDate);
			endDate = epoch_to_human(reportObj.end_time);
			//$('#cal_end').text(format_date_str(endDate));
			document.forms.report_form.end_time.value = format_date_str(endDate);
		}
	}
	current_obj_type = field_str;
}

function set_initial_state(what, val)
{
	var rep_type = $('input[name=type]').attr('value');
	if (document.forms.report_form_sla != undefined) {
		f = document.forms.report_form_sla;
	} else {
		f = document.forms.report_form;
	}
	var item = '';
	var elem = false;
	switch (what) {
		case 'includesoftstates':
			if (val!='0') {
				toggle_label_weight(1, 'include_softstates');
				f.elements.includesoftstates.checked = true;
				if ($('#fancybox-content').is(':visible')) {
					$('input[name=' + what + ']').attr('checked', true);
				}
			} else {
				toggle_label_weight(0, 'include_softstates');
				f.elements.includesoftstates.checked = false;
				if ($('#fancybox-content').is(':visible')) {
					$('input[name=' + what + ']').attr('checked', false);
				}
			}
			break;
		case 'cluster_mode':
			if (val!='0') {
				toggle_label_weight(1, 'cluster_mode');
				if ($('#fancybox-content').is(':visible')) {
					$('input[name=' + what + ']').attr('checked', true);
				}
			} else {
				toggle_label_weight(0, 'cluster_mode');
				if ($('#fancybox-content').is(':visible')) {
					$('input[name=' + what + ']').attr('checked', false);
				}
			}
			break;
		case 'report_name':
			f.elements.report_name.value = val;
			break;
		case 'rpttimeperiod':
			item = 'rpttimeperiod';
			break;
		case 'report_period-start':
			item = 'start_year';
			if ($('select[name=' + item + '] option').length < 2) {
				setTimeout('set_initial_state("' + what + '", ' + val + ')', 1000);
			}
			break;
		case 'report_period-startmonth':
			item = 'start_month';
			if ($('select[name=' + item + '] option').length < 2) {
				if (val < 10) val = '0' + val;
				setTimeout('set_initial_state("' + what + '", ' + val + ')', 1000);
			}
			break;
		case 'report_period-end':
			item = 'end_year';
			if ($('select[name=' + item + '] option').length < 2) {
				setTimeout('set_initial_state("' + what + '", ' + val + ')', 1000);
			}
			break;
		case 'report_period-endmonth':
			item = 'end_month';
			if ($('select[name=' + item + '] option').length < 2) {
				if (val < 10) val = '0' + val;
				setTimeout('set_initial_state("' + what + '", ' + val + ')', 1000);
			}
			break;
		default:
			item = what;
	}
	if (item) {
		elem = f[item];
		if (elem) {
			for (i=0;i<elem.length;i++) {
				if (elem.options[i].value==val) {
					elem.options[i].selected = true;
				}
			}
		}
	}
}

// used from setup
function new_schedule_rows(id, period_str, recipients, filename, description, rep_type_str, report_type_id, local_persistent_filepath)
{
	var return_str = '';
	var reportname = $("#saved_report_id option:selected").text();
	reportname = remove_scheduled_str(reportname);
	return_str += '<tr id="report-' + id + '" class="odd">';
	return_str += '<td class="period_select" title="' + _reports_edit_information + '" id="period_id-' + id + '">' + period_str + '</td>';
	return_str += '<td class="report_name" id="' + report_type_id + '.report_id-' + id + '">' + reportname + '</td>';
	return_str += '<td class="iseditable" title="' + _reports_edit_information + '" id="recipients-' + id + '">' + recipients + '</td>';
	return_str += '<td class="iseditable" title="' + _reports_edit_information + '" id="filename-' + id + '">' + filename + '</td>';
	return_str += '<td class="iseditable_txtarea" title="' + _reports_edit_information + '" id="description-' + id + '">' + description + '</td>';
	return_str += '<td class="iseditable" title="' + _reports_edit_information + '" id="local_persistent_filepath-' + id + '">' + local_persistent_filepath + '</td>';
	return_str += '<td><form><input type="button" class="send_report_now" id="send_now_' + rep_type_str + '_' + id + '" title="' + _reports_send_now + '" value="&nbsp;" onclick="send_report_now(\'' + rep_type_str + '\', ' + id + ')"></form>';
	return_str += '<div class="delete_schedule ' + rep_type_str + '_del" onclick="schedule_delete(' + id + ', \'' + rep_type_str + '\');" id="delid_' + id + '"><img src="' + _site_domain + _theme_path + 'icons/16x16/delete-schedule.png" class="deleteimg" title="Delete scheduled report" /></td></tr>';
	$('#' + rep_type_str + '_scheduled_reports_table').append(return_str);
	setup_editable();
	$('#new_schedule_report_form').clearForm();
	setTimeout(delayed_hide_progress, 1000);
	update_visible_schedules(false);
	//nr_of_scheduled_instances++;

	// make sure we hide message about no schedules and show table headers
	$('#' + rep_type_str + '_no_result').hide();
	$('#' + rep_type_str + '_headers').show();
	return true;
}

function toggle_edit() {
	var $tabs = $('#report-tabs').tabs();
	$tabs.tabs('select', 1);
}

/**
*	create ajax call to reports/fetch_field_value
*	to fetch a specific field value and asssign it to html element.
*/
function fetch_field_value(type, id, elem_id)
{
	$.ajax({
		url: _site_domain + _index_page + '/reports/fetch_field_value?id=' + id + '&type=' + type,
		success: function(data) {
			$('#' + elem_id).text(data);
			$('#fancybox-content #' + elem_id).text(data);
		}
	});
}

function check_email(mail_str)
{
	var emailRegex= new RegExp(/^(("[\w-\s]+")|([\w-]+(?:\.[\w-]+)*)|("[\w-\s]+")([\w-]+(?:\.[\w-]+)*))(@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$)|(@\[?((25[0-5]\.|2[0-4][0-9]\.|1[0-9]{2}\.|[0-9]{1,2}\.))((25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\.){2}(25[0-5]|2[0-4][0-9]|1[0-9]{2}|[0-9]{1,2})\]?$)/i );
	var mail_list = mail_str.split(',');
	var result = false;
	if (mail_list.length > 1) {
		for (var i=0;i<mail_list.length;i++) {
			if ($.trim(mail_list[i]) != '') {
				var m = emailRegex.exec($.trim(mail_list[i]));
				if (!m) {
					return false;
				} else {
					result = true;
				}
			}
		}
	} else {
		mail_str = $.trim(mail_str);
		var m = emailRegex.exec(mail_str);
		if (!m) {
			result = false;
		} else {
			result = true;
		}
	}
	return result;
}

function get_sla_values() {
	var sla_id = $('#sla_report_id').attr('value');

	if (!sla_id) {
		// don't try to fetch sla values when we have no id
		return;
	}
	show_progress('progress', _wait_str);
	var ajax_url = _site_domain + _index_page + '/ajax/';
	var url = ajax_url + "get_sla_from_saved_reports/";
	var data = {sla_id: sla_id}

	$.ajax({
		url: url,
		type: 'POST',
		data: data,
		success: function(data) {
			if (data != '') {
				// OK, populate
				populate_saved_sla_data(data);
				$('.sla_values').show();
			} else {
				// error
				jgrowl_message('Unable to fetch saved sla values...', _reports_error);
			}
		}
	});
}

function toggle_state(the_id)
{
	var fancy_str = '';

	if ($('#fancybox-content').is(':visible')) {
		fancy_str = '#fancybox-content ';
	}

	if ($(fancy_str + '#' + the_id).attr('checked') ) {
		$(fancy_str + '#' + the_id).attr('checked', false);
	} else {
		$(fancy_str + '#' + the_id).attr('checked', true);
	}
}
