<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('videos', function (Blueprint $table) {
            $table->unsignedBigInteger('id', true);
            $table->foreignId('user_id')->constrained();
            $table->string('title');
            $table->string('slug');
            $table->text('description');
            $table->string('location');
            $table->timestamps();

            $table->primary(['id']);
            $table->unique(['user_id', 'slug']);
            $table->fullText(['description']);
            $table->spatialIndex(['location']);
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('videos');
    }
};
