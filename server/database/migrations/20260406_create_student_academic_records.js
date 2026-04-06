// Migration for creating student_academic_records table

exports.up = function(knex) {
  return knex.schema.createTable('student_academic_records', function(table) {
    table.bigIncrements('id').primary();
    table.string('usn', 12);
    table.string('semester', 255);
    table.string('grade', 255);
    table.timestamp('created_at');
    table.timestamp('updated_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('student_academic_records');
};
