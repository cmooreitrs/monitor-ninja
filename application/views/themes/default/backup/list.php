<?php defined('SYSPATH') OR die('No direct access allowed.'); ?>

<script type="text/javascript">
$('a.delete').live('click', function(){
	var link = $(this)
	$('#backupstatus').load($(link).attr('href'), function(){
		if ($(this).find('span').hasClass('ok'))
			$(link).closest('tr').remove();
	});
	return false;
});
</script>

<div class="widget left w98">
	<h2><?php echo $this->translate->_('Backup/Restore'); ?></h2>
	<div id="backupstatus">&nbsp;</div>
	<br />
	<p><a href="#">Save your perfect configuration</a></p>
	<br />
	<table class="white-table">
		<?php foreach ($files as $file): ?>
		<tr>
		  <td><a href="<?php echo url::base() . 'index.php/backup/view/' . $file; ?>"><?php echo $file; ?></a></td>
		  <td><a href="#">restore</a></td>
		  <td><a class="delete" href="<?php echo url::base() . 'index.php/backup/delete/' . $file; ?>">delete</a></td>
		</tr>
		<?php endforeach; ?>
	</table>
</div>
